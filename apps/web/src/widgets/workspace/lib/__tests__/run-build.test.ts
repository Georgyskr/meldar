// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@meldar/orchestrator', () => ({
	consumeSseStream: async function* (body: ReadableStream | null) {
		if (!body) return
		const reader = body.getReader()
		const decoder = new TextDecoder()
		let buf = ''
		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				buf += decoder.decode(value, { stream: true })
				const parts = buf.split('\n\n')
				buf = parts.pop() ?? ''
				for (const part of parts) {
					if (part.startsWith('data:')) yield JSON.parse(part.slice(5).trim())
				}
			}
			if (buf.trim().length > 0 && buf.startsWith('data:')) yield JSON.parse(buf.slice(5).trim())
		} finally {
			reader.releaseLock()
		}
	},
}))

vi.mock('@/shared/ui', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
		info: vi.fn(),
		warning: vi.fn(),
		dismiss: vi.fn(),
	},
}))

vi.mock('../subscribe-pipeline-events', () => ({
	subscribePipelineEvents: async function* () {
		yield { type: 'started', buildId: 'b1', kanbanCardId: 'c1' }
		yield { type: 'committed', buildId: 'b1', kanbanCardId: 'c1', fileCount: 1, tokenCost: 10 }
	},
}))

import { runBuild } from '../run-build'

function sseResponse(events: unknown[]): Response {
	const enc = new TextEncoder()
	const body = new ReadableStream({
		start(controller) {
			for (const evt of events) {
				controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`))
			}
			controller.close()
		},
	})
	return new Response(body, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	})
}

describe('runBuild', () => {
	let publish: ReturnType<typeof vi.fn>
	beforeEach(() => {
		publish = vi.fn()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('streams SSE events through publish on happy path', async () => {
		const fetchFn = vi.fn().mockResolvedValueOnce(
			sseResponse([
				{ type: 'started', buildId: 'b1', kanbanCardId: 'c1' },
				{ type: 'committed', buildId: 'b1', kanbanCardId: 'c1', fileCount: 1, tokenCost: 10 },
			]),
		)

		await runBuild('proj-1', 'c1', 'hello', publish as never, { fetchFn })

		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'started' }))
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'committed' }))
		expect(publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
	})

	it('on 409 PIPELINE_IN_PROGRESS, attaches to live pipeline events instead of retrying', async () => {
		const fetchFn = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { code: 'PIPELINE_IN_PROGRESS', message: 'busy' } }), {
				status: 409,
				headers: { 'Content-Type': 'application/json' },
			}),
		)

		await runBuild('proj-1', 'c1', 'hello', publish as never, { fetchFn })

		expect(fetchFn).toHaveBeenCalledTimes(1)
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'started' }))
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'committed' }))
		expect(publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
	})

	it('publishes a failed event on 400 validation errors (no retry)', async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'bad' } }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			}),
		)

		await runBuild('proj-1', 'c1', 'hello', publish as never, { fetchFn })

		expect(fetchFn).toHaveBeenCalledOnce()
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
	})

	it('swallows aborts silently (no failed event, no toast)', async () => {
		const fetchFn = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'))
		const controller = new AbortController()
		controller.abort()

		await runBuild('proj-1', 'c1', 'hello', publish as never, {
			fetchFn,
			signal: controller.signal,
		})

		expect(publish).not.toHaveBeenCalled()
	})
})
