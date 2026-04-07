import type Anthropic from '@anthropic-ai/sdk'
import { getDb } from '@meldar/db/client'
import { kanbanCards } from '@meldar/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
	PLAN_GENERATION_SYSTEM_PROMPT,
	PLAN_RETRY_PROMPT,
} from '@/features/project-onboarding/lib/prompts'
import {
	generatePlanRequestSchema,
	getTokenCostRange,
	type PlanOutput,
	planOutputSchema,
} from '@/features/project-onboarding/lib/schemas'
import { verifyToken } from '@/server/identity/jwt'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { mustHaveRateLimit, projectsCreateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOKENS = 4096

const projectIdSchema = z.string().uuid()

const limiter = mustHaveRateLimit(projectsCreateLimit, 'generate-plan')

type RouteContext = { params: Promise<{ projectId: string }> }

async function callHaiku(
	client: Anthropic,
	systemPrompt: string,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	signal?: AbortSignal,
): Promise<string> {
	const response = await client.messages.create(
		{
			model: MODELS.HAIKU,
			max_tokens: MAX_TOKENS,
			system: systemPrompt,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
		},
		{ signal, timeout: 60_000 },
	)

	const textBlock = response.content.find((block) => block.type === 'text')
	if (!textBlock || textBlock.type !== 'text') {
		throw new Error('Haiku returned no text content')
	}
	return textBlock.text
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

	if (limiter) {
		const { success } = await limiter.limit(session.userId)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a few minutes.' } },
				{ status: 429 },
			)
		}
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

	const client = getAnthropicClient()

	const plan = await generatePlanWithRetry(client, parsed.data.messages, request.signal)
	if (!plan) {
		return NextResponse.json(
			{ error: { code: 'GENERATION_FAILED', message: 'Failed to generate a valid build plan' } },
			{ status: 500 },
		)
	}

	try {
		const cards = await insertPlanAsCards(projectId, plan)
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
	client: Anthropic,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	signal?: AbortSignal,
): Promise<PlanOutput | null> {
	const raw = await callHaiku(client, PLAN_GENERATION_SYSTEM_PROMPT, messages, signal)
	const plan = parseAndValidatePlan(raw)
	if (plan) return plan

	const retryMessages = [
		...messages,
		{ role: 'assistant' as const, content: raw },
		{ role: 'user' as const, content: PLAN_RETRY_PROMPT },
	]
	const retryRaw = await callHaiku(client, PLAN_GENERATION_SYSTEM_PROMPT, retryMessages, signal)
	return parseAndValidatePlan(retryRaw)
}

async function insertPlanAsCards(projectId: string, plan: PlanOutput) {
	const db = getDb()
	const now = new Date()

	const [maxPos] = await db
		.select({ maxPosition: sql<number>`COALESCE(MAX(${kanbanCards.position}), -1)` })
		.from(kanbanCards)
		.where(and(eq(kanbanCards.projectId, projectId), isNull(kanbanCards.parentId)))

	let milestonePosition = (maxPos?.maxPosition ?? -1) + 1

	const allValues: (typeof kanbanCards.$inferInsert)[] = []

	for (const milestone of plan.milestones) {
		const milestoneId = crypto.randomUUID()

		allValues.push({
			id: milestoneId,
			projectId,
			parentId: null,
			position: milestonePosition++,
			title: milestone.title,
			description: milestone.description,
			taskType: milestone.taskType,
			explainerText: milestone.whatYouLearn,
			generatedBy: 'haiku',
			dependsOn: [],
			createdAt: now,
			updatedAt: now,
		})

		for (let subtaskIdx = 0; subtaskIdx < milestone.subtasks.length; subtaskIdx++) {
			const subtask = milestone.subtasks[subtaskIdx]
			const tokenCost = getTokenCostRange(subtask.componentType)

			allValues.push({
				id: crypto.randomUUID(),
				projectId,
				parentId: milestoneId,
				position: subtaskIdx,
				title: subtask.title,
				description: subtask.description,
				taskType: subtask.taskType,
				acceptanceCriteria: subtask.acceptanceCriteria,
				explainerText: subtask.whatYouLearn,
				generatedBy: 'haiku',
				tokenCostEstimateMin: tokenCost.min,
				tokenCostEstimateMax: tokenCost.max,
				dependsOn: [],
				createdAt: now,
				updatedAt: now,
			})
		}
	}

	if (allValues.length === 0) return []

	return db.insert(kanbanCards).values(allValues).returning()
}
