// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const publishedEvents: unknown[] = []

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
					if (part.startsWith('data:')) {
						yield JSON.parse(part.slice(5).trim())
					}
				}
			}
			if (buf.trim().length > 0 && buf.startsWith('data:')) {
				yield JSON.parse(buf.slice(5).trim())
			}
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

import { runBuild } from '../run-build'

function sseStream(events: unknown[]): ReadableStream {
	const enc = new TextEncoder()
	return new ReadableStream({
		start(controller) {
			for (const evt of events) {
				controller.enqueue(enc.encode(`data: ${JSON.stringify(evt)}\n\n`))
			}
			controller.close()
		},
	})
}

function okStream(events: unknown[]): Response {
	return new Response(sseStream(events), {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	})
}

function conflict(): Response {
	return new Response(JSON.stringify({ error: { code: 'BUILD_IN_PROGRESS', message: 'busy' } }), {
		status: 409,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('runBuild retry', () => {
	let publish: ReturnType<typeof vi.fn>
	let sleep: ReturnType<typeof vi.fn>

	beforeEach(() => {
		publishedEvents.length = 0
		publish = vi.fn((e: unknown) => publishedEvents.push(e))
		sleep = vi.fn().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('retries on 409 BUILD_IN_PROGRESS and succeeds on the second attempt', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(conflict())
			.mockResolvedValueOnce(
				okStream([
					{ type: 'started', buildId: 'b1', kanbanCardId: 'c1' },
					{ type: 'committed', buildId: 'b1', kanbanCardId: 'c1', fileCount: 1, tokenCost: 10 },
				]),
			)

		await runBuild('proj-1', 'c1', 'hello', publish as never, { fetchFn, sleep: sleep as never })

		expect(fetchFn).toHaveBeenCalledTimes(2)
		expect(sleep).toHaveBeenCalledOnce()
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'started' }))
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'committed' }))
		expect(publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
	})

	it('retries when stream emits build_in_progress failed event (post-TOCTOU race)', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(
				okStream([{ type: 'failed', code: 'build_in_progress', reason: 'another build active' }]),
			)
			.mockResolvedValueOnce(
				okStream([
					{ type: 'started', buildId: 'b2', kanbanCardId: 'c1' },
					{ type: 'committed', buildId: 'b2', kanbanCardId: 'c1', fileCount: 2, tokenCost: 20 },
				]),
			)

		await runBuild('proj-1', 'c1', 'hello', publish as never, { fetchFn, sleep: sleep as never })

		expect(fetchFn).toHaveBeenCalledTimes(2)
		expect(publish).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: 'failed', code: 'build_in_progress' }),
		)
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'started' }))
	})

	it('does NOT retry on 400 validation errors', async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'bad' } }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			}),
		)

		await runBuild('proj-1', 'c1', 'hello', publish as never, {
			fetchFn,
			sleep: sleep as never,
			maxAttempts: 4,
		})

		expect(fetchFn).toHaveBeenCalledOnce()
		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
	})

	it('gives up after maxAttempts on persistent 409', async () => {
		const fetchFn = vi.fn().mockResolvedValue(conflict())

		await runBuild('proj-1', 'c1', 'hello', publish as never, {
			fetchFn,
			sleep: sleep as never,
			maxAttempts: 3,
			delayMs: 10,
		})

		expect(fetchFn).toHaveBeenCalledTimes(3)
		expect(publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'failed', reason: expect.stringContaining('busy') }),
		)
	})

	it('gives up after maxAttempts when stream keeps returning build_in_progress', async () => {
		const fetchFn = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					okStream([{ type: 'failed', code: 'build_in_progress', reason: 'active' }]),
				),
			)

		await runBuild('proj-1', 'c1', 'hello', publish as never, {
			fetchFn,
			sleep: sleep as never,
			maxAttempts: 2,
			delayMs: 10,
		})

		expect(fetchFn).toHaveBeenCalledTimes(2)
		expect(publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'failed',
				reason: expect.stringContaining('kept running'),
			}),
		)
	})
})
