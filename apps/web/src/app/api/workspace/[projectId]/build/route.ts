import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runBuildForUser } from '@/server/build/run-build'
import { requireAuth } from '@/server/identity/require-auth'
import { appendPipelineEvent } from '@/server/lib/pipeline-event-log'
import { endPipelineRun, heartbeatPipelineRun, startPipelineRun } from '@/server/lib/pipeline-lock'
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

	const lock = await startPipelineRun(projectId, auth.userId, 'single')
	if (!lock.ok) {
		return NextResponse.json(
			{
				error: {
					code: lock.reason === 'project_not_found' ? 'NOT_FOUND' : 'PIPELINE_IN_PROGRESS',
					message:
						lock.reason === 'project_not_found'
							? 'Project not found.'
							: 'Another build is still running. Wait a few seconds and try again.',
				},
			},
			{ status: lock.reason === 'project_not_found' ? 404 : 409 },
		)
	}
	const pipelineId = lock.pipelineId

	const result = await runBuildForUser({
		projectId,
		userId: auth.userId,
		prompt: parsed.data.prompt,
		kanbanCardId: parsed.data.kanbanCardId,
		signal: request.signal,
		source: 'http_route',
	})

	if (!result.ok) {
		await endPipelineRun(pipelineId, 'failed', {
			errorCode: result.code,
			errorReason: result.message,
		}).catch(() => undefined)
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

	return new Response(instrumentSingleBuildStream(result.stream, pipelineId), {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
			'x-meldar-pipeline-id': pipelineId,
		},
	})
}

function instrumentSingleBuildStream(
	stream: ReadableStream<Uint8Array>,
	pipelineId: string,
): ReadableStream<Uint8Array> {
	const HEARTBEAT_INTERVAL_MS = 30_000
	const heartbeat = setInterval(() => {
		void heartbeatPipelineRun(pipelineId).catch((err) => {
			console.error('[build-route] heartbeat failed', err)
		})
	}, HEARTBEAT_INTERVAL_MS)
	let terminalState: 'succeeded' | 'failed' | 'cancelled' = 'cancelled'
	let finished = false
	const decoder = new TextDecoder()
	let buf = ''

	async function teardown(): Promise<void> {
		if (finished) return
		finished = true
		clearInterval(heartbeat)
		await endPipelineRun(pipelineId, terminalState).catch((err) => {
			console.error('[build-route] endPipelineRun failed', err)
		})
	}

	const reader = stream.getReader()
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const { done, value } = await reader.read()
				if (done) {
					controller.close()
					await teardown()
					return
				}
				controller.enqueue(value)
				buf += decoder.decode(value, { stream: true })
				const records = buf.split('\n\n')
				buf = records.pop() ?? ''
				for (const record of records) {
					const dataLine = record.split('\n').find((l) => l.startsWith('data:'))
					if (!dataLine) continue
					const raw = dataLine.slice(5).trim()
					if (raw === '[DONE]') continue
					try {
						const event = JSON.parse(raw) as { type: string }
						await appendPipelineEvent({ runId: pipelineId, type: event.type, payload: event })
						if (event.type === 'committed') terminalState = 'succeeded'
						else if (
							event.type === 'failed' ||
							event.type === 'pipeline_failed' ||
							event.type === 'deploy_failed'
						)
							terminalState = 'failed'
					} catch (err) {
						console.error('[build-route] appendPipelineEvent failed', err)
						terminalState = 'failed'
						controller.error(err)
						await teardown()
						return
					}
				}
			} catch (err) {
				controller.error(err)
				await teardown()
			}
		},
		async cancel() {
			try {
				await reader.cancel()
			} catch {
				/* ignored */
			}
			await teardown()
		},
	})
}
