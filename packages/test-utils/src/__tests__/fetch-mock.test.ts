/**
 * Tests for the fetch test mock factory. Confines the unsafe `as unknown as
 * typeof globalThis.fetch` cast to one place.
 */

import { describe, expect, it, vi } from 'vitest'
import { makeFetchMock } from '../fetch-mock'

describe('makeFetchMock', () => {
	it('returns a function structurally typed as global fetch', async () => {
		const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
		const fetchImpl = makeFetchMock(handler)

		const res = await fetchImpl('https://example.com', { method: 'GET' })

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith('https://example.com', { method: 'GET' })
		expect(res.status).toBe(200)
		expect(await res.text()).toBe('ok')
	})
})
