import type Anthropic from '@anthropic-ai/sdk'
import { usageToCents } from '@meldar/tokens'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
	PLAN_GENERATION_SYSTEM_PROMPT,
	PLAN_RETRY_PROMPT,
} from '@/features/project-onboarding/lib/prompts'
import {
	generatePlanRequestSchema,
	type PlanOutput,
	planOutputSchema,
} from '@/features/project-onboarding/lib/schemas'
import { verifyToken } from '@/server/identity/jwt'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { insertPlanCards } from '@/server/lib/insert-plan-cards'
import { checkRateLimit, mustHaveRateLimit, projectsCreateLimit } from '@/server/lib/rate-limit'
import {
	checkAllSpendCeilings,
	recordGlobalSpend,
	recordUserDailySpend,
	recordUserHourlySpend,
} from '@/server/lib/spend-ceiling'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOKENS = 4096

const projectIdSchema = z.string().uuid()

const limiter = mustHaveRateLimit(projectsCreateLimit, 'generate-plan')

type RouteContext = { params: Promise<{ projectId: string }> }

async function callHaiku(
	userId: string,
	projectId: string,
	client: Anthropic,
	systemPrompt: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	signal?: AbortSignal,
): Promise<{ text: string; cents: number }> {
	const startedAt = Date.now()
	const response = await client.messages.create(
		{
			model: MODELS.HAIKU,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
		},
		{ signal, timeout: 25_000 },
	)

	const inputTokens = response.usage?.input_tokens ?? 0
	const outputTokens = response.usage?.output_tokens ?? 0
	const cents = usageToCents(MODELS.HAIKU, { inputTokens, outputTokens })

	const textBlock = response.content.find((block) => block.type === 'text')
	if (!textBlock || textBlock.type !== 'text') {
		recordAiCall({
			userId,
			projectId,
			kind: 'generate_plan',
			model: MODELS.HAIKU,
			inputTokens,
			outputTokens,
			centsCharged: cents,
			latencyMs: Date.now() - startedAt,
			stopReason: response.stop_reason ?? null,
			status: 'error',
			errorCode: 'no_text_content',
		})
		throw new Error('Haiku returned no text content')
	}

	recordAiCall({
		userId,
		projectId,
		kind: 'generate_plan',
		model: MODELS.HAIKU,
		inputTokens,
		outputTokens,
		centsCharged: cents,
		latencyMs: Date.now() - startedAt,
		stopReason: response.stop_reason ?? null,
		status: 'ok',
	})

	return { text: textBlock.text, cents }
}

function parseAndValidatePlan(raw: string): PlanOutput | null {
	try {
		const parsed = JSON.parse(raw)
		const result = planOutputSchema.safeParse(parsed)
		return result.success ? result.data : null
	} catch {
		return null
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success, serviceError } = await checkRateLimit(limiter, session.userId, true)
	if (!success) {
		return NextResponse.json(
			{
				error: {
					code: serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED',
					message: serviceError
						? 'Rate limiter is temporarily unavailable. Try again shortly.'
						: 'Too many requests. Wait a few minutes.',
				},
			},
			{ status: serviceError ? 503 : 429 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: { code: 'INVALID_JSON', message: 'Request body must be JSON' } },
			{ status: 400 },
		)
	}

	const parsed = generatePlanRequestSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request body',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	const spendCheck = await checkAllSpendCeilings(session.userId)
	if (!spendCheck.allowed) {
		const status =
			spendCheck.reason === 'user_hourly' ? 429 : spendCheck.reason === 'user_daily' ? 402 : 503
		return NextResponse.json(
			{
				error: { code: spendCheck.reason.toUpperCase(), message: spendCheck.userMessage },
			},
			{ status },
		)
	}

	const client = getAnthropicClient()

	const plan = await generatePlanWithRetry(
		session.userId,
		projectId,
		client,
		parsed.data.messages,
		request.signal,
	)
	if (!plan) {
		return NextResponse.json(
			{ error: { code: 'GENERATION_FAILED', message: 'Failed to generate a valid build plan' } },
			{ status: 500 },
		)
	}

	try {
		const cards = await insertPlanCards(projectId, plan.milestones, 'haiku')
		return NextResponse.json({ cards }, { status: 201 })
	} catch (err) {
		console.error('[generate-plan] card insertion failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to save build plan' } },
			{ status: 500 },
		)
	}
}

async function generatePlanWithRetry(
	userId: string,
	projectId: string,
	client: Anthropic,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	signal?: AbortSignal,
): Promise<PlanOutput | null> {
	const first = await callHaiku(
		userId,
		projectId,
		client,
		PLAN_GENERATION_SYSTEM_PROMPT,
		messages,
		signal,
	)
	Promise.all([
		recordGlobalSpend(first.cents),
		recordUserHourlySpend(userId, first.cents),
		recordUserDailySpend(userId, first.cents),
	]).catch((err) => {
		console.error('[generate-plan] spend recording failed:', err)
	})
	const plan = parseAndValidatePlan(first.text)
	if (plan) return plan

	const retryMessages = [
		...messages,
		{ role: 'assistant' as const, content: first.text },
		{ role: 'user' as const, content: PLAN_RETRY_PROMPT },
	]
	const retry = await callHaiku(
		userId,
		projectId,
		client,
		PLAN_GENERATION_SYSTEM_PROMPT,
		retryMessages,
		signal,
	)
	Promise.all([
		recordGlobalSpend(retry.cents),
		recordUserHourlySpend(userId, retry.cents),
		recordUserDailySpend(userId, retry.cents),
	]).catch((err) => {
		console.error('[generate-plan] spend recording failed:', err)
	})
	return parseAndValidatePlan(retry.text)
}
