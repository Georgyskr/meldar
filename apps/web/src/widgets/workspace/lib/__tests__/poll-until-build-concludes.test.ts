// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pollUntilBuildConcludes } from '../poll-until-build-concludes'

type Card = { id: string; state: string }

function makeCardsResponse(cards: Card[]): Response {
	return new Response(JSON.stringify({ cards }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

function makeStatusResponse(active: boolean): Response {
	return new Response(JSON.stringify({ active }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})
}

function fetchByUrl(map: {
	cards?: () => Response | Promise<Response>
	pipelineStatus?: () => Response | Promise<Response>
}) {
	return vi.fn(async (url: string | URL | Request) => {
		const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
		if (u.includes('/pipeline-status')) {
			return map.pipelineStatus ? map.pipelineStatus() : makeStatusResponse(true)
		}
		return map.cards ? map.cards() : makeCardsResponse([])
	})
}

describe('pollUntilBuildConcludes', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('reloads the page when a building card transitions to built', async () => {
		const reload = vi.fn()
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'building' }]))
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'built' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'building' }], undefined, {
			intervalMs: 100,
			maxAttempts: 10,
			reload,
		})

		await vi.advanceTimersByTimeAsync(100)
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})

	it('reloads when /pipeline-status flips from active=true to active=false', async () => {
		const reload = vi.fn()
		const fetchMock = vi.fn().mockImplementation((url: string) => {
			if (url.includes('/pipeline-status')) {
				const call = fetchMock.mock.calls.filter((c) =>
					String(c[0]).includes('/pipeline-status'),
				).length
				return Promise.resolve(
					new Response(JSON.stringify({ active: call <= 1 }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					}),
				)
			}
			return Promise.resolve(makeCardsResponse([{ id: 'a', state: 'building' }]))
		})
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'building' }], undefined, {
			intervalMs: 50,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(50)
		await vi.advanceTimersByTimeAsync(50)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})

	it('calls onProgress when half the budget is spent', async () => {
		const onProgress = vi.fn()
		const reload = vi.fn()
		const fetchMock = vi.fn().mockResolvedValue(makeCardsResponse([{ id: 'a', state: 'building' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'building' }], undefined, {
			intervalMs: 10,
			maxAttempts: 6,
			reload,
			onProgress,
		})
		await vi.advanceTimersByTimeAsync(200)
		await promise
		expect(onProgress).toHaveBeenCalled()
	})

	it('reloads when any card transitions to failed', async () => {
		const reload = vi.fn()
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'failed' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'ready' }], undefined, {
			intervalMs: 100,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})

	it('does NOT reload on a pre-existing terminal card (no transition)', async () => {
		const reload = vi.fn()
		const fetchMock = fetchByUrl({
			pipelineStatus: () => makeStatusResponse(true),
			cards: () =>
				makeCardsResponse([
					{ id: 'old', state: 'built' },
					{ id: 'a', state: 'building' },
				]),
		})
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes(
			'proj-1',
			[
				{ id: 'old', state: 'built' },
				{ id: 'a', state: 'building' },
			],
			undefined,
			{ intervalMs: 10, maxAttempts: 3, reload },
		)
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).not.toHaveBeenCalled()
	})

	it('stops polling when abort signal fires — no reload', async () => {
		const reload = vi.fn()
		const fetchMock = fetchByUrl({
			pipelineStatus: () => makeStatusResponse(true),
			cards: () => makeCardsResponse([{ id: 'a', state: 'building' }]),
		})
		vi.stubGlobal('fetch', fetchMock)

		const controller = new AbortController()
		const promise = pollUntilBuildConcludes(
			'proj-1',
			[{ id: 'a', state: 'building' }],
			controller.signal,
			{
				intervalMs: 100,
				maxAttempts: 10,
				reload,
			},
		)
		await vi.advanceTimersByTimeAsync(100)
		controller.abort()
		await vi.advanceTimersByTimeAsync(500)
		await promise
		expect(reload).not.toHaveBeenCalled()
	})

	it('gives up after maxAttempts without reload', async () => {
		const reload = vi.fn()
		const fetchMock = fetchByUrl({
			pipelineStatus: () => makeStatusResponse(true),
			cards: () => makeCardsResponse([{ id: 'a', state: 'building' }]),
		})
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'building' }], undefined, {
			intervalMs: 10,
			maxAttempts: 3,
			reload,
		})
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).not.toHaveBeenCalled()
		// Each attempt makes 2 fetches (pipeline-status + cards) when status returns active=true
		expect(fetchMock).toHaveBeenCalledTimes(6)
	})

	it('ignores transient fetch failures and keeps polling', async () => {
		const reload = vi.fn()
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'built' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', [{ id: 'a', state: 'building' }], undefined, {
			intervalMs: 10,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(50)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})
})
