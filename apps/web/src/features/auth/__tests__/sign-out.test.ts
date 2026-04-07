import { makeFetchMock } from '@meldar/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { performSignOut } from '../sign-out'

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('performSignOut', () => {
	it('calls DELETE /api/auth/me', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true }))
		const result = await performSignOut(makeFetchMock(fetchMock))
		expect(result.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/auth/me',
			expect.objectContaining({ method: 'DELETE' }),
		)
	})

	it('returns ok on a 200 response', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true }))
		const result = await performSignOut(makeFetchMock(fetchMock))
		expect(result.ok).toBe(true)
	})

	it('returns a failure message when the server responds non-2xx', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'oops' }))
		const result = await performSignOut(makeFetchMock(fetchMock))
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Sign out failed. Try again.')
	})

	it('returns a network error message when fetch throws', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error('connection refused'))
		const result = await performSignOut(makeFetchMock(fetchMock))
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Network error. Try again.')
	})
})
