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

		const promise = pollUntilBuildConcludes('proj-1', undefined, {
			intervalMs: 100,
			maxAttempts: 10,
			reload,
		})

		await vi.advanceTimersByTimeAsync(100)
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})

	it('reloads when any card is failed', async () => {
		const reload = vi.fn()
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'failed' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', undefined, {
			intervalMs: 100,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})

	it('stops polling when abort signal fires — no reload', async () => {
		const reload = vi.fn()
		const fetchMock = vi.fn().mockResolvedValue(makeCardsResponse([{ id: 'a', state: 'building' }]))
		vi.stubGlobal('fetch', fetchMock)

		const controller = new AbortController()
		const promise = pollUntilBuildConcludes('proj-1', controller.signal, {
			intervalMs: 100,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(100)
		controller.abort()
		await vi.advanceTimersByTimeAsync(500)
		await promise
		expect(reload).not.toHaveBeenCalled()
	})

	it('gives up after maxAttempts without reload', async () => {
		const reload = vi.fn()
		const fetchMock = vi.fn().mockResolvedValue(makeCardsResponse([{ id: 'a', state: 'building' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', undefined, {
			intervalMs: 10,
			maxAttempts: 3,
			reload,
		})
		await vi.advanceTimersByTimeAsync(100)
		await promise
		expect(reload).not.toHaveBeenCalled()
		expect(fetchMock).toHaveBeenCalledTimes(3)
	})

	it('ignores transient fetch failures and keeps polling', async () => {
		const reload = vi.fn()
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(makeCardsResponse([{ id: 'a', state: 'built' }]))
		vi.stubGlobal('fetch', fetchMock)

		const promise = pollUntilBuildConcludes('proj-1', undefined, {
			intervalMs: 10,
			maxAttempts: 10,
			reload,
		})
		await vi.advanceTimersByTimeAsync(50)
		await promise
		expect(reload).toHaveBeenCalledOnce()
	})
})
