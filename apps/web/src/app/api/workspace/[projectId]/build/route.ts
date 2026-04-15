import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runBuildForUser } from '@/server/build/run-build'
import { requireAuth } from '@/server/identity/require-auth'
import { isPipelineActive } from '@/server/lib/pipeline-lock'
import { checkRateLimit, mustHaveRateLimit, workspaceBuildLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const projectIdSchema = z.string().uuid()

const buildRequestSchema = z.object({
	prompt: z.string().min(1).max(8_000),
	kanbanCardId: z.string().uuid().optional(),
})

const rateLimit = mustHaveRateLimit(workspaceBuildLimit, 'workspaceBuild')

type RouteContext = {
	params: Promise<{ projectId: string }>
}

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

	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const { success: rateLimitSuccess, serviceError } = await checkRateLimit(
		rateLimit,
		auth.userId,
		true,
	)
	if (!rateLimitSuccess) {
		return NextResponse.json(
			{
				error: {
					code: serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED',
					message: serviceError
						? 'Rate limiter is temporarily unavailable. Try again shortly.'
						: 'Too many builds. Wait a few minutes and try again.',
				},
			},
			{ status: serviceError ? 503 : 429 },
		)
	}

	if (await isPipelineActive(projectId)) {
		return NextResponse.json(
			{
				error: {
					code: 'PIPELINE_IN_PROGRESS',
					message:
						'Setup is still running. Wait for the current pipeline to finish before sending feedback.',
				},
			},
			{ status: 409 },
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
	const parsed = buildRequestSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid build request',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	const result = await runBuildForUser({
		projectId,
		userId: auth.userId,
		prompt: parsed.data.prompt,
		kanbanCardId: parsed.data.kanbanCardId,
		signal: request.signal,
		source: 'http_route',
	})

	if (!result.ok) {
		return NextResponse.json(
			{
				error: {
					code: result.code,
					message: result.message,
					...(result.activeBuildId ? { activeBuildId: result.activeBuildId } : {}),
				},
			},
			{ status: result.status },
		)
	}

	return new Response(result.stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		},
	})
}
