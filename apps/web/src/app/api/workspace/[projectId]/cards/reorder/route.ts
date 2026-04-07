import { getDb } from '@meldar/db/client'
import { kanbanCards } from '@meldar/db/schema'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { cardsLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const reorderSchema = z.object({
	parentId: z.string().uuid().nullable(),
	cardIds: z.array(z.string().uuid()).min(1),
})

const limiter = mustHaveRateLimit(cardsLimit, 'cards')

type RouteContext = { params: Promise<{ projectId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
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
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
				{ status: 429 },
			)
		}
	}

	const { projectId } = await context.params

	if (!z.string().uuid().safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Invalid project ID' } },
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

	const parsed = reorderSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid reorder data',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	try {
		const db = getDb()
		const { parentId, cardIds } = parsed.data

		for (let i = 0; i < cardIds.length; i++) {
			await db
				.update(kanbanCards)
				.set({
					position: i,
					parentId,
					updatedAt: new Date(),
				})
				.where(and(eq(kanbanCards.id, cardIds[i]), eq(kanbanCards.projectId, projectId)))
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('[api/workspace/cards] reorder failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder cards' } },
			{ status: 500 },
		)
	}
}
