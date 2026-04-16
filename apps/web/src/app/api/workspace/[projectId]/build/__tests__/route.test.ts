/**
 * Tests for the workspace build SSE route.
 *
 * Three layers worth covering:
 *
 *  1. `sseStreamFromGenerator` — the bridge from an `OrchestratorEvent`
 *     async generator to a UTF-8 `ReadableStream` of SSE frames. Pure code,
 *     no Next.js setup needed.
 *  2. The POST handler's auth + validation guards — these short-circuit
 *     before any orchestrator code runs and return JSON, not SSE.
 *  3. End-to-end: a fake orchestrator deps object yields events through
 *     the handler. We don't exercise the real Postgres/R2/Anthropic stack
 *     here — those each have their own contract tests.
 *
 * Auth is mocked at the JWT level (`verifyToken`) so we don't need a real
 * cookie / signing key.
 */

import {
	consumeSseStream,
	formatSseDone,
	formatSseEvent,
	type OrchestratorEvent,
	parseSseRecord,
	SSE_DONE_SENTINEL,
} from '@meldar/orchestrator'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sseStreamFromGenerator } from '@/server/build/run-build'

async function* gen(events: OrchestratorEvent[]): AsyncGenerator<OrchestratorEvent, void, unknown> {
	for (const e of events) yield e
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
	const reader = stream.getReader()
	const decoder = new TextDecoder()
	let out = ''
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		out += decoder.decode(value, { stream: true })
	}
	out += decoder.decode()
	return out
}

describe('sseStreamFromGenerator', () => {
	it('emits one SSE frame per event followed by the [DONE] sentinel', async () => {
		const events: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'p1' },
			{ type: 'prompt_sent', promptHash: 'h', estimatedCents: 3 },
			{ type: 'committed', buildId: 'b1', tokenCost: 200, actualCents: 1, fileCount: 1 },
		]
		const stream = sseStreamFromGenerator(gen(events))
		const wire = await readAll(stream)

		const expected = events.map(formatSseEvent).join('') + formatSseDone()
		expect(wire).toBe(expected)
	})

	it('round-trips events through consumeSseStream', async () => {
		const events: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'p1' },
			{
				type: 'file_written',
				path: 'src/app/page.tsx',
				contentHash: 'h',
				sizeBytes: 64,
				fileIndex: 0,
			},
			{ type: 'committed', buildId: 'b1', tokenCost: 100, actualCents: 1, fileCount: 1 },
		]
		const stream = sseStreamFromGenerator(gen(events))

		const got: OrchestratorEvent[] = []
		for await (const e of consumeSseStream(stream)) got.push(e)
		expect(got).toEqual(events)
	})

	it('emits a `failed` frame and still terminates with [DONE] when the generator throws', async () => {
		async function* throwing(): AsyncGenerator<OrchestratorEvent, void, unknown> {
			yield { type: 'started', buildId: 'b1', projectId: 'p1' }
			throw new Error('boom')
		}
		const stream = sseStreamFromGenerator(throwing())
		const wire = await readAll(stream)

		expect(wire).toContain('event: started')
		expect(wire).toContain('event: failed')
		expect(wire).toContain('"reason":"Something went wrong. Try the step again."')
		expect(wire).toContain('"code":"route_stream_error"')
		expect(wire.endsWith(formatSseDone())).toBe(true)
	})

	it('stops iterating once the abort signal fires', async () => {
		const yielded: number[] = []
		async function* counting(): AsyncGenerator<OrchestratorEvent, void, unknown> {
			for (let i = 0; i < 100; i++) {
				yielded.push(i)
				yield { type: 'started', buildId: `b${i}`, projectId: 'p' }
			}
		}
		const ctrl = new AbortController()
		const stream = sseStreamFromGenerator(counting(), ctrl.signal)
		const reader = stream.getReader()

		await reader.read()
		ctrl.abort()
		while (true) {
			const { done } = await reader.read()
			if (done) break
		}

		expect(yielded.length).toBeLessThan(100)
	})

	it('parses each emitted frame as a valid SSE record', async () => {
		const events: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'p1' },
			{ type: 'prompt_sent', promptHash: 'h', estimatedCents: 3 },
		]
		const wire = await readAll(sseStreamFromGenerator(gen(events)))
		const records = wire.split('\n\n').filter((r) => r.length > 0)
		expect(records).toHaveLength(events.length + 1)

		const eventRecords = records.slice(0, events.length)
		const doneRecord = records[records.length - 1]

		eventRecords.forEach((rec, i) => {
			expect(parseSseRecord(rec)).toEqual(events[i])
		})
		expect(parseSseRecord(doneRecord)).toBeNull()
		expect(doneRecord).toContain(SSE_DONE_SENTINEL)
	})
})

vi.mock('@/server/email', () => ({
	sendFirstBuildEmail: vi.fn(),
	getBaseUrl: vi.fn(() => 'https://meldar.ai'),
}))

vi.mock('@meldar/tokens', async () => {
	const actual = await vi.importActual<typeof import('@meldar/tokens')>('@meldar/tokens')
	return {
		...actual,
		debitTokens: vi.fn().mockResolvedValue({ balance: 195 }),
	}
})

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({})),
}))

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: vi.fn(async (request: Request) => {
		const cookie = request.headers.get('cookie')
		const match = cookie?.match(/meldar-auth=([^;]+)/)
		if (match?.[1] === 'valid_token') {
			return { ok: true, userId: 'user_1', email: 'u@x.com', emailVerified: true }
		}
		return {
			ok: false,
			response: NextResponse.json(
				{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
				{ status: 401 },
			),
		}
	}),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: async () => ({ success: true }),
	mustHaveRateLimit: <T>(limiter: T) => limiter,
	workspaceBuildLimit: null,
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

vi.mock('@/server/lib/pipeline-event-log', () => ({
	appendPipelineEvent: vi.fn().mockResolvedValue(1),
}))

vi.mock('@/server/lib/pipeline-lock', () => ({
	findActivePipelineRun: vi.fn().mockResolvedValue(null),
	startPipelineRun: vi.fn().mockResolvedValue({ ok: true, pipelineId: 'test-pipeline-id' }),
	endPipelineRun: vi.fn().mockResolvedValue(undefined),
	heartbeatPipelineRun: vi.fn().mockResolvedValue(undefined),
}))

const { mockGetActiveStreamingBuild } = vi.hoisted(() => ({
	mockGetActiveStreamingBuild: vi.fn<(projectId: string) => Promise<string | null>>(),
}))

vi.mock('@meldar/orchestrator', async () => {
	const actual =
		await vi.importActual<typeof import('@meldar/orchestrator')>('@meldar/orchestrator')
	return {
		...actual,
		buildOrchestratorDeps: vi.fn(() => ({
			storage: {
				getActiveStreamingBuild: mockGetActiveStreamingBuild,
				getCurrentFiles: vi.fn(async () => [
					{
						projectId: 'fake_project',
						path: 'package.json',
						contentHash: 'abc',
						sizeBytes: 2,
						r2Key: 'r2://abc',
						version: 1,
					},
				]),
				readFile: vi.fn(async () => '{}'),
			} as never,
			sandbox: null,
			ledger: {} as never,
			anthropic: {} as never,
		})),
		orchestrateBuild: vi.fn(async function* () {
			yield {
				type: 'started',
				buildId: 'fake_build',
				projectId: 'fake_project',
			} satisfies OrchestratorEvent
			yield {
				type: 'committed',
				buildId: 'fake_build',
				tokenCost: 100,
				actualCents: 1,
				fileCount: 1,
			} satisfies OrchestratorEvent
		}),
	}
})

const { POST } = await import('../route')

const VALID_PROJECT_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(opts: { body: unknown; cookie?: string; projectId?: string }): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const projectId = opts.projectId ?? VALID_PROJECT_ID
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/build`, {
		method: 'POST',
		headers,
		body: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
	})
	return {
		request,
		context: { params: Promise.resolve({ projectId }) },
	}
}

describe('POST /api/workspace/[projectId]/build', () => {
	beforeEach(() => {
		mockGetActiveStreamingBuild.mockReset()
		mockGetActiveStreamingBuild.mockResolvedValue(null)
		mockVerifyProjectOwnership.mockReset()
		mockVerifyProjectOwnership.mockResolvedValue({ id: 'fake_project', name: 'Test Project' })
	})

	it('returns 401 when no auth cookie is present', async () => {
		const { request, context } = makeRequest({ body: { prompt: 'hi' } })
		const res = await POST(request, context)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const { request, context } = makeRequest({ body: { prompt: 'hi' }, cookie: 'bogus' })
		const res = await POST(request, context)
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid JSON body', async () => {
		const { request, context } = makeRequest({ body: 'not json{', cookie: 'valid_token' })
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when prompt is missing', async () => {
		const { request, context } = makeRequest({ body: {}, cookie: 'valid_token' })
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when prompt is empty', async () => {
		const { request, context } = makeRequest({ body: { prompt: '' }, cookie: 'valid_token' })
		const res = await POST(request, context)
		expect(res.status).toBe(400)
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const { request, context } = makeRequest({
			body: { prompt: 'hi' },
			cookie: 'valid_token',
			projectId: 'not-a-uuid',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 404 when project ownership fails', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const { request, context } = makeRequest({
			body: { prompt: 'hi' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('streams SSE events on a valid request', async () => {
		const { request, context } = makeRequest({
			body: { prompt: 'add a button' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toContain('text/event-stream')
		expect(res.headers.get('Cache-Control')).toContain('no-cache')

		expect(res.body).toBeTruthy()
		const events: OrchestratorEvent[] = []
		// biome-ignore lint/style/noNonNullAssertion: just asserted body is truthy
		for await (const ev of consumeSseStream(res.body!)) events.push(ev)

		expect(events).toHaveLength(2)
		expect(events[0]).toEqual({
			type: 'started',
			buildId: 'fake_build',
			projectId: 'fake_project',
		})
		expect(events[1]).toEqual({
			type: 'committed',
			buildId: 'fake_build',
			tokenCost: 100,
			actualCents: 1,
			fileCount: 1,
		})
	})

	it('returns 409 when a streaming build is already in progress for the project', async () => {
		mockGetActiveStreamingBuild.mockResolvedValue('22222222-2222-4222-8222-222222222222')
		const { request, context } = makeRequest({
			body: { prompt: 'race the other tab' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(409)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('BUILD_IN_PROGRESS')
	})

	it('does not stream when the project has an in-flight build (no double-submit)', async () => {
		mockGetActiveStreamingBuild.mockResolvedValue('33333333-3333-4333-8333-333333333333')
		const { request, context } = makeRequest({
			body: { prompt: 'p' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.headers.get('Content-Type')).not.toContain('text/event-stream')
	})
})
