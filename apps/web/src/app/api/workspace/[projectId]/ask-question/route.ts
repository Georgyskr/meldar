import { usageToCents } from '@meldar/tokens'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAskQuestionSystemPrompt } from '@/features/project-onboarding/lib/prompts'
import {
	askQuestionRequestSchema,
	askQuestionResponseSchema,
} from '@/features/project-onboarding/lib/schemas'
import { requireAuth } from '@/server/identity/require-auth'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { adaptiveLimit, checkRateLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import {
	checkAllSpendCeilings,
	recordGlobalSpend,
	recordUserDailySpend,
	recordUserHourlySpend,
} from '@/server/lib/spend-ceiling'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const limiter = mustHaveRateLimit(adaptiveLimit, 'ask-question')

const FALLBACK_QUESTIONS = [
	'What do you want to see first when you open the app?',
	'How would you like to add your data into the app?',
	'Is this app just for you, or will others use it too?',
	'Would you like the app to send you any reminders or updates?',
	'Is there anything else you would like the app to do?',
] as const

type RouteContext = { params: Promise<{ projectId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success, serviceError } = await checkRateLimit(limiter, auth.userId, true)
	if (!success) {
		if (serviceError) {
			return NextResponse.json({ question: FALLBACK_QUESTIONS[0] }, { status: 503 })
		}
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
			{ status: 429 },
		)
	}

	const project = await verifyProjectOwnership(projectId, auth.userId)
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

	const parsed = askQuestionRequestSchema.safeParse(body)
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

	const { messages, questionIndex } = parsed.data
	const systemPrompt = buildAskQuestionSystemPrompt(questionIndex)

	const spendCheck = await checkAllSpendCeilings(auth.userId)
	if (!spendCheck.allowed) {
		return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
	}

	const startedAt = Date.now()

	try {
		const client = getAnthropicClient()
		const response = await client.messages.create(
			{
				model: MODELS.HAIKU,
				max_tokens: 256,
				system: systemPrompt,
				messages: messages.map((m) => ({ role: m.role, content: m.content })),
			},
			{ signal: request.signal, timeout: 30_000 },
		)

		const inputTokens = response.usage?.input_tokens ?? 0
		const outputTokens = response.usage?.output_tokens ?? 0
		const actualCents = usageToCents(MODELS.HAIKU, { inputTokens, outputTokens })
		Promise.all([
			recordGlobalSpend(actualCents),
			recordUserHourlySpend(auth.userId, actualCents),
			recordUserDailySpend(auth.userId, actualCents),
		]).catch((err) => {
			console.error('[ask-question] spend recording failed:', err)
		})
		recordAiCall({
			userId: auth.userId,
			projectId,
			kind: 'ask_question',
			model: MODELS.HAIKU,
			inputTokens,
			outputTokens,
			centsCharged: actualCents,
			latencyMs: Date.now() - startedAt,
			stopReason: response.stop_reason ?? null,
			status: 'ok',
		})

		const textBlock = response.content.find((block) => block.type === 'text')
		if (!textBlock || textBlock.type !== 'text') {
			return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
		}

		const validated = askQuestionResponseSchema.safeParse({
			question: textBlock.text.trim(),
		})
		if (!validated.success) {
			return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
		}

		return NextResponse.json({ question: validated.data.question })
	} catch (err) {
		console.error('[ask-question] Haiku call failed', err)
		return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
	}
}
