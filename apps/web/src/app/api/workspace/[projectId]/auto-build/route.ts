import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runAutoBuild, sseStreamFromGenerator } from '@/server/build/run-auto-build'
import { verifyToken } from '@/server/identity/jwt'
import { checkRateLimit, mustHaveRateLimit, workspaceBuildLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const projectIdSchema = z.string().uuid()

const rateLimit = mustHaveRateLimit(workspaceBuildLimit, 'workspaceBuild')

type RouteContext = { params: Promise<{ projectId: string }> }

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

	const { success: rateLimitSuccess } = await checkRateLimit(rateLimit, session.userId, true)
	if (!rateLimitSuccess) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many builds. Wait a few minutes.' } },
			{ status: 429 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const generator = runAutoBuild({
		projectId,
		userId: session.userId,
		signal: request.signal,
	})

	const stream = sseStreamFromGenerator(generator, request.signal)

	return new Response(stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		},
	})
}
