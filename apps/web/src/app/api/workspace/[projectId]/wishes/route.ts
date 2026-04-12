import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/identity/require-auth'
import { checkRateLimit, mustHaveRateLimit, wishesLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const bodySchema = z.object({
	originalDescription: z.string().max(500).optional(),
	proposal: z
		.object({
			appType: z.string().max(40).optional(),
			style: z.string().max(30).optional(),
			palette: z.string().max(30).optional(),
			sections: z.array(z.string().max(30)).max(8).optional(),
			tone: z.string().max(30).optional(),
		})
		.optional(),
	overrides: z
		.record(z.string().max(50), z.string().max(200))
		.refine((r) => Object.keys(r).length <= 20, 'Too many overrides (max 20)')
		.optional(),
	approvedAt: z.string().optional(),
})

const limiter = mustHaveRateLimit(wishesLimit, 'wishes')

type RouteContext = { params: Promise<{ projectId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success } = await checkRateLimit(limiter, auth.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a few minutes.' } },
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

	const parsed = bodySchema.safeParse(body)
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

	try {
		const db = getDb()

		const [current] = await db
			.select({ wishes: projects.wishes })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1)

		const existingWishes = (current?.wishes as Record<string, unknown>) ?? {}
		const merged = { ...existingWishes, ...parsed.data }

		const [updated] = await db
			.update(projects)
			.set({ wishes: merged, updatedAt: new Date() })
			.where(eq(projects.id, projectId))
			.returning({ wishes: projects.wishes })

		return NextResponse.json({ wishes: updated.wishes })
	} catch (err) {
		console.error('[wishes] update failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to update wishes' } },
			{ status: 500 },
		)
	}
}
