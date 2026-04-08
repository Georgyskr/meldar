import { getDb } from '@meldar/db/client'
import { kanbanCards } from '@meldar/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { kanbanCardGeneratedBySchema, kanbanCardTaskTypeSchema } from '@/entities/kanban-card'
import { verifyToken } from '@/server/identity/jwt'
import { cardsLimit, checkRateLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createCardSchema = z.object({
	title: z.string().trim().min(1, 'title required').max(80, 'title too long'),
	description: z.string().max(500).nullable().optional(),
	parentId: z.string().uuid().nullable().optional(),
	taskType: kanbanCardTaskTypeSchema.optional().default('feature'),
	acceptanceCriteria: z.array(z.string()).max(5).nullable().optional(),
	explainerText: z.string().max(500).nullable().optional(),
	generatedBy: kanbanCardGeneratedBySchema.optional().default('user'),
	dependsOn: z.array(z.string().uuid()).optional(),
})

const limiter = mustHaveRateLimit(cardsLimit, 'cards')

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success: rateLimitSuccess } = await checkRateLimit(limiter, session.userId)
	if (!rateLimitSuccess) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
			{ status: 429 },
		)
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

	try {
		const db = getDb()
		const cards = await db
			.select()
			.from(kanbanCards)
			.where(eq(kanbanCards.projectId, projectId))
			.orderBy(sql`${kanbanCards.parentId} NULLS FIRST`, kanbanCards.position)
		return NextResponse.json({ cards })
	} catch (err) {
		console.error('[api/workspace/cards] list query failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cards' } },
			{ status: 500 },
		)
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
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

	const parsed = createCardSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid card data',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	try {
		const db = getDb()
		const parentId = parsed.data.parentId ?? null

		const [maxPos] = await db
			.select({ maxPosition: sql<number>`COALESCE(MAX(${kanbanCards.position}), -1)` })
			.from(kanbanCards)
			.where(
				and(
					eq(kanbanCards.projectId, projectId),
					parentId === null ? isNull(kanbanCards.parentId) : eq(kanbanCards.parentId, parentId),
				),
			)

		const position = (maxPos?.maxPosition ?? -1) + 1

		const [card] = await db
			.insert(kanbanCards)
			.values({
				projectId,
				parentId,
				position,
				title: parsed.data.title,
				description: parsed.data.description ?? null,
				taskType: parsed.data.taskType,
				acceptanceCriteria: parsed.data.acceptanceCriteria ?? null,
				explainerText: parsed.data.explainerText ?? null,
				generatedBy: parsed.data.generatedBy,
				dependsOn: parsed.data.dependsOn ?? [],
			})
			.returning()

		return NextResponse.json({ card }, { status: 201 })
	} catch (err) {
		console.error('[api/workspace/cards] create failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create card' } },
			{ status: 500 },
		)
	}
}
