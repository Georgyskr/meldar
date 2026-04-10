import { getDb } from '@meldar/db/client'
import { kanbanCards } from '@meldar/db/schema'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
	type KanbanCardState,
	kanbanCardGeneratedBySchema,
	kanbanCardStateSchema,
	kanbanCardTaskTypeSchema,
} from '@/entities/kanban-card'
import { canTransition } from '@/features/kanban/model/card-state-machine'
import { verifyToken } from '@/server/identity/jwt'
import { cardsLimit, checkRateLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const updateCardSchema = z.object({
	title: z.string().trim().min(1).max(80).optional(),
	description: z.string().max(500).nullable().optional(),
	parentId: z.string().uuid().nullable().optional(),
	position: z.number().int().optional(),
	state: kanbanCardStateSchema.optional(),
	required: z.boolean().optional(),
	taskType: kanbanCardTaskTypeSchema.optional(),
	acceptanceCriteria: z.array(z.string()).max(5).nullable().optional(),
	explainerText: z.string().max(500).nullable().optional(),
	generatedBy: kanbanCardGeneratedBySchema.optional(),
	tokenCostEstimateMin: z.number().int().nullable().optional(),
	tokenCostEstimateMax: z.number().int().nullable().optional(),
	tokenCostActual: z.number().int().nullable().optional(),
	dependsOn: z.array(z.string().uuid()).optional(),
	blockedReason: z.string().nullable().optional(),
	lastBuildId: z.string().uuid().nullable().optional(),
	builtAt: z.coerce.date().nullable().optional(),
})

const limiter = mustHaveRateLimit(cardsLimit, 'cards')

type RouteContext = { params: Promise<{ projectId: string; cardId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(limiter, session.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
			{ status: 429 },
		)
	}

	const { projectId, cardId } = await context.params

	if (!z.string().uuid().safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Invalid project ID' } },
			{ status: 400 },
		)
	}
	if (!z.string().uuid().safeParse(cardId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Invalid card ID' } },
			{ status: 400 },
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

	const parsed = updateCardSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid update data',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	try {
		const db = getDb()

		if (parsed.data.state !== undefined) {
			const [currentCard] = await db
				.select({ state: kanbanCards.state })
				.from(kanbanCards)
				.where(and(eq(kanbanCards.id, cardId), eq(kanbanCards.projectId, projectId)))
				.limit(1)

			if (!currentCard) {
				return NextResponse.json(
					{ error: { code: 'NOT_FOUND', message: 'Card not found' } },
					{ status: 404 },
				)
			}

			const currentState = currentCard.state as KanbanCardState
			if (currentState !== parsed.data.state && !canTransition(currentState, parsed.data.state)) {
				return NextResponse.json(
					{
						error: {
							code: 'INVALID_TRANSITION',
							message: `Cannot transition from ${currentState} to ${parsed.data.state}`,
						},
					},
					{ status: 400 },
				)
			}
		}

		const [card] = await db
			.update(kanbanCards)
			.set({
				...parsed.data,
				updatedAt: new Date(),
			})
			.where(and(eq(kanbanCards.id, cardId), eq(kanbanCards.projectId, projectId)))
			.returning()

		if (!card) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Card not found' } },
				{ status: 404 },
			)
		}

		return NextResponse.json({ card })
	} catch (err) {
		console.error('[api/workspace/cards] update failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' } },
			{ status: 500 },
		)
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(limiter, session.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
			{ status: 429 },
		)
	}

	const { projectId, cardId } = await context.params

	if (!z.string().uuid().safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Invalid project ID' } },
			{ status: 400 },
		)
	}
	if (!z.string().uuid().safeParse(cardId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Invalid card ID' } },
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	try {
		const db = getDb()
		const [card] = await db
			.select({ id: kanbanCards.id })
			.from(kanbanCards)
			.where(and(eq(kanbanCards.id, cardId), eq(kanbanCards.projectId, projectId)))
			.limit(1)

		if (!card) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Card not found' } },
				{ status: 404 },
			)
		}

		await db
			.delete(kanbanCards)
			.where(and(eq(kanbanCards.id, cardId), eq(kanbanCards.projectId, projectId)))

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('[api/workspace/cards] delete failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete card' } },
			{ status: 500 },
		)
	}
}
