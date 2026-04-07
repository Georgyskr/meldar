import { makeFetchMock } from '@meldar/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { submitSignIn } from '../sign-in-submit'

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('submitSignIn', () => {
	it('rejects an invalid email shape before calling the network', async () => {
		const fetchMock = vi.fn()
		const result = await submitSignIn(
			{ email: 'nope', password: 'whatever' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('rejects an empty password before calling the network', async () => {
		const fetchMock = vi.fn()
		const result = await submitSignIn({ email: 'a@b.com', password: '' }, makeFetchMock(fetchMock))
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('returns ok with the user id on a successful response', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(200, {
				success: true,
				user: {
					id: '550e8400-e29b-41d4-a716-446655440000',
					email: 'a@b.com',
					name: null,
				},
			}),
		)
		const result = await submitSignIn(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(true)
		if (!result.ok) throw new Error('expected success')
		expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000')
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/auth/login',
			expect.objectContaining({ method: 'POST' }),
		)
	})

	it('shows the generic invalid credentials message on 401, never the typed input', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(401, {
				error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
			}),
		)
		const result = await submitSignIn(
			{ email: 'a@b.com', password: 'totally-wrong' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Invalid email or password')
		expect(result.message).not.toContain('totally-wrong')
		expect(result.message).not.toContain('a@b.com')
	})

	it('surfaces the rate limit message on 429', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(429, {
				error: {
					code: 'RATE_LIMITED',
					message: 'Too many login attempts. Try again in 15 minutes.',
				},
			}),
		)
		const result = await submitSignIn(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Too many login attempts. Try again in 15 minutes.')
	})

	it('handles network errors gracefully', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error('connection refused'))
		const result = await submitSignIn(
			{ email: 'a@b.com', password: 'whatever' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Network error. Try again.')
	})

	it('rejects a malformed success response', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse(200, { success: true, user: { id: 'nope', email: 'a@b.com', name: null } }),
			)
		const result = await submitSignIn(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Server returned an unexpected response')
	})
})
