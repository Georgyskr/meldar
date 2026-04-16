// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribePipelineEvents } from '../subscribe-pipeline-events'

type Evt = { seq: number; type: string; payload: unknown }
function response(runId: string | null, events: Evt[], active: boolean): Response {
	return new Response(JSON.stringify({ runId, events, active }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('subscribePipelineEvents', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('yields events in order until active becomes false', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(
				response(
					'run-1',
					[
						{ seq: 1, type: 'started', payload: { type: 'started', buildId: 'b1' } },
						{ seq: 2, type: 'committed', payload: { type: 'committed', buildId: 'b1' } },
					],
					true,
				),
			)
			.mockResolvedValueOnce(
				response('run-1', [{ seq: 3, type: 'deployed', payload: { type: 'deployed' } }], false),
			)

		const collected: string[] = []
		const gen = subscribePipelineEvents('proj-1', undefined, {
			fetchFn,
			intervalMs: 10,
		})
		const consumer = (async () => {
			for await (const event of gen) {
				collected.push((event as { type: string }).type)
			}
		})()
		await vi.advanceTimersByTimeAsync(50)
		await consumer

		expect(collected).toEqual(['started', 'committed', 'deployed'])
		expect(fetchFn).toHaveBeenCalledTimes(2)
	})

	it('publishes a synthetic failed event when no run is found to attach to', async () => {
		const fetchFn = vi.fn().mockResolvedValue(response(null, [], false))
		const collected: Array<{ type: string; reason?: string }> = []
		for await (const event of subscribePipelineEvents('proj-1', undefined, {
			fetchFn,
			intervalMs: 10,
		})) {
			collected.push(event as { type: string; reason?: string })
		}
		expect(collected).toHaveLength(1)
		expect(collected[0].type).toBe('failed')
		expect(fetchFn).toHaveBeenCalledTimes(1)
	})

	it('publishes synthetic failed when run finished with no events before client attached', async () => {
		const fetchFn = vi.fn().mockImplementation(async () => response('run-1', [], false))
		const collected: Array<{ type: string }> = []
		for await (const event of subscribePipelineEvents('proj-1', undefined, {
			fetchFn,
			intervalMs: 10,
		})) {
			collected.push(event as { type: string })
		}
		expect(collected).toHaveLength(1)
		expect(collected[0].type).toBe('failed')
	})

	it('sends x-meldar-client header (CSRF hardening)', async () => {
		const fetchFn = vi.fn().mockResolvedValue(response('run-1', [], false))
		const collected: unknown[] = []
		for await (const event of subscribePipelineEvents('proj-1', undefined, {
			fetchFn,
			intervalMs: 10,
		})) {
			collected.push(event)
		}
		const firstCallArgs = fetchFn.mock.calls[0] as [string, RequestInit]
		expect(firstCallArgs[1]?.headers).toMatchObject({ 'x-meldar-client': '1' })
	})

	it('stops when abort signal fires', async () => {
		const controller = new AbortController()
		const fetchFn = vi.fn().mockImplementation(async () => response('run-1', [], true))

		const collected: string[] = []
		const gen = subscribePipelineEvents('proj-1', controller.signal, {
			fetchFn,
			intervalMs: 50,
			maxDurationMs: 10_000,
		})
		const consumer = (async () => {
			for await (const event of gen) {
				collected.push((event as { type: string }).type)
			}
		})()
		await vi.advanceTimersByTimeAsync(60)
		controller.abort()
		await vi.advanceTimersByTimeAsync(200)
		await consumer
		expect(collected).toEqual([])
	})

	it('advances lastSeq so repeated events are not re-yielded', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(
				response('run-1', [{ seq: 1, type: 'started', payload: { type: 'started' } }], true),
			)
			.mockResolvedValueOnce(
				response('run-1', [{ seq: 2, type: 'committed', payload: { type: 'committed' } }], false),
			)

		const collected: string[] = []
		const gen = subscribePipelineEvents('proj-1', undefined, { fetchFn, intervalMs: 10 })
		const consumer = (async () => {
			for await (const event of gen) {
				collected.push((event as { type: string }).type)
			}
		})()
		await vi.advanceTimersByTimeAsync(60)
		await consumer

		expect(fetchFn.mock.calls[0][0]).toContain('since=0')
		expect(fetchFn.mock.calls[1][0]).toContain('since=1')
		expect(fetchFn.mock.calls[1][0]).toContain('runId=run-1')
		expect(collected).toEqual(['started', 'committed'])
	})
})
