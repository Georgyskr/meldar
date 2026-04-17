import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/identity/require-auth'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'
import { businessNameSchema } from '@/shared/lib/business-name'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const serviceSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1).max(200),
	durationMinutes: z.number().positive().optional(),
	priceEur: z.number().nonnegative().optional(),
})

const settingsSchema = z
	.object({
		businessName: businessNameSchema.optional(),
		services: z.array(serviceSchema).max(50).optional(),
		availableHours: z.record(z.string(), z.unknown()).optional(),
		hours: z.record(z.string(), z.unknown()).optional(),
	})
	.strict()

const WISHES_WHITELIST = ['businessName', 'services', 'availableHours', 'hours', 'verticalId']

function filterWishes(raw: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	for (const key of WISHES_WHITELIST) {
		if (key in raw) out[key] = raw[key]
	}
	return out
}

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

		const rawWishes = (row?.wishes as Record<string, unknown> | null) ?? {}
		return NextResponse.json({ settings: filterWishes(rawWishes) })
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
