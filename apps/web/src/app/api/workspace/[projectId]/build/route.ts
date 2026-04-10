/**
 * POST /api/workspace/[projectId]/build
 *
 * Thin HTTP wrapper over `runBuildForUser()` — the single choke point for
 * every build in Meldar. The HTTP route handles auth, rate limiting, request
 * shape validation, and ownership check, then delegates the atomic "reserve
 * tokens, run orchestrator, refund on failure" sequence to the shared function.
 *
 * Chat-triggered builds (Phase 3) call the same `runBuildForUser()` directly,
 * so there is exactly one audited path to `orchestrateBuild`. Drift between
 * two code paths was the biggest security risk in the original plan.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runBuildForUser } from '@/server/build/run-build'
import { verifyToken } from '@/server/identity/jwt'
import { checkRateLimit, mustHaveRateLimit, workspaceBuildLimit } from '@/server/lib/rate-limit'

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

	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success: rateLimitSuccess, serviceError } = await checkRateLimit(
		rateLimit,
		session.userId,
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
		userId: session.userId,
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
