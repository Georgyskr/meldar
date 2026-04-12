import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/identity/require-auth'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const settingsSchema = z
	.object({
		businessName: z.string().min(1).max(200).optional(),
		services: z.array(z.string().min(1).max(200)).max(50).optional(),
		hours: z.record(z.string().max(20), z.string().max(50)).optional(),
	})
	.strict()

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	try {
		const db = getDb()
		const [row] = await db
			.select({ wishes: projects.wishes })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1)

		const settings = (row?.wishes as Record<string, unknown>) ?? {}
		return NextResponse.json({ settings })
	} catch (err) {
		console.error('[settings] read failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load settings' } },
			{ status: 500 },
		)
	}
}

export async function PUT(request: NextRequest, context: RouteContext) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
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

	const parsed = settingsSchema.safeParse(body)
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

		return NextResponse.json({ settings: updated.wishes })
	} catch (err) {
		console.error('[settings] update failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } },
			{ status: 500 },
		)
	}
}
