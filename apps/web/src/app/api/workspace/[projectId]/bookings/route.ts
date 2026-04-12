import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTaskHistory, proposeTask } from '@/server/agents/agent-task-service'
import { requireAuth } from '@/server/identity/require-auth'
import { bookingPublicLimit, checkRateLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limiter = mustHaveRateLimit(bookingPublicLimit, 'booking-public')

const projectIdSchema = z.string().uuid()

const bookingSchema = z.object({
	service: z.string().min(1).max(200),
	date: z.string().min(1).max(20),
	time: z.string().min(1).max(10),
	name: z.string().min(1).max(200),
	email: z.string().email().max(320),
	note: z.string().max(1000).optional(),
})

type RouteContext = { params: Promise<{ projectId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
	const rateResult = await checkRateLimit(limiter, ip)
	if (!rateResult.success) {
		return NextResponse.json(
			{
				error: {
					code: 'RATE_LIMITED',
					message: 'Too many booking requests. Try again in a minute.',
				},
			},
			{ status: 429 },
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

	const parsed = bookingSchema.safeParse(body)
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
		const [project] = await db
			.select({ wishes: projects.wishes, name: projects.name })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1)

		if (!project) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } },
				{ status: 400 },
			)
		}

		const wishes = (project.wishes as Record<string, unknown>) ?? {}
		const businessName = (wishes.businessName as string) ?? project.name

		const task = await proposeTask(projectId, 'booking_confirmation', {
			...parsed.data,
			businessName,
		})

		return NextResponse.json({ success: true, bookingId: task.id })
	} catch (err) {
		console.error('[bookings] create failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking' } },
			{ status: 500 },
		)
	}
}

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
		const bookings = await getTaskHistory(projectId, 50)
		return NextResponse.json({ bookings })
	} catch (err) {
		console.error('[bookings] list failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load bookings' } },
			{ status: 500 },
		)
	}
}
