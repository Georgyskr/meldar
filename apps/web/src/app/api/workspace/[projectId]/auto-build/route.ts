import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runAutoBuild, sseStreamFromGenerator } from '@/server/build/run-auto-build'
import { requireAuth } from '@/server/identity/require-auth'
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

	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const rateResult = await checkRateLimit(rateLimit, auth.userId, true)
	if (!rateResult.success) {
		const status = rateResult.serviceError ? 503 : 429
		const code = rateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
		const message = rateResult.serviceError
			? 'Setup service is temporarily unavailable. Try again shortly.'
			: 'Too many setups. Wait a few minutes.'
		return NextResponse.json({ error: { code, message } }, { status })
	}

	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	try {
		storage = buildProjectStorageFromEnv()
	} catch {
		storage = buildProjectStorageWithoutR2()
	}
	const activeBuildId = await storage.getActiveStreamingBuild(projectId)
	if (activeBuildId) {
		return NextResponse.json(
			{
				error: {
					code: 'BUILD_IN_PROGRESS',
					message: 'Setup is already running for this project.',
					activeBuildId,
				},
			},
			{ status: 409 },
		)
	}

	const generator = runAutoBuild({
		projectId,
		userId: auth.userId,
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
