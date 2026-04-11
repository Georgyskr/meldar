import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTaskHistory, proposeTask } from '@/server/agents/agent-task-service'
import { verifyToken } from '@/server/identity/jwt'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bookingLimiter =
	process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
		? new Ratelimit({
				redis: new Redis({
					url: process.env.UPSTASH_REDIS_REST_URL,
					token: process.env.UPSTASH_REDIS_REST_TOKEN,
				}),
				limiter: Ratelimit.slidingWindow(10, '1 m'),
				prefix: 'rl:booking-public',
			})
		: null

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

	if (bookingLimiter) {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
		const { success } = await bookingLimiter.limit(ip)
		if (!success) {
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
				{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
				{ status: 404 },
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
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
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
