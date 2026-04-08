import { makeFetchMock } from '@meldar/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { submitSignUp } from '../sign-up-submit'

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('submitSignUp', () => {
	it('rejects an invalid email shape before calling the network', async () => {
		const fetchMock = vi.fn()
		const result = await submitSignUp(
			{ email: 'not-an-email', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.field).toBe('email')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('rejects a password shorter than 8 chars before calling the network', async () => {
		const fetchMock = vi.fn()
		const result = await submitSignUp(
			{ email: 'a@b.com', password: 'short' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.field).toBe('password')
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('returns ok with the userId on a successful response', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse(200, { success: true, userId: '550e8400-e29b-41d4-a716-446655440000' }),
			)
		const result = await submitSignUp(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(true)
		if (!result.ok) throw new Error('expected success')
		expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000')
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/auth/register',
			expect.objectContaining({ method: 'POST' }),
		)
	})

	it('surfaces the server error message on 409 conflict', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(409, {
				error: { code: 'CONFLICT', message: 'An account with this email already exists' },
			}),
		)
		const result = await submitSignUp(
			{ email: 'taken@example.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('An account with this email already exists')
	})

	it('surfaces the rate limit message on 429', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(429, {
				error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
			}),
		)
		const result = await submitSignUp(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Too many attempts. Try again later.')
	})

	it('handles network errors gracefully', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error('connection refused'))
		const result = await submitSignUp(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Network error. Try again.')
	})

	it('rejects a malformed success response', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { success: true, userId: 'not-a-uuid' }))
		const result = await submitSignUp(
			{ email: 'a@b.com', password: 'longenough' },
			makeFetchMock(fetchMock),
		)
		expect(result.ok).toBe(false)
		if (result.ok) throw new Error('expected failure')
		expect(result.message).toBe('Server returned an unexpected response')
	})

	it('strips unknown fields from the request body', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				jsonResponse(200, { success: true, userId: '550e8400-e29b-41d4-a716-446655440000' }),
			)
		await submitSignUp(
			{ email: 'a@b.com', password: 'longenough', name: 'Alice' },
			makeFetchMock(fetchMock),
		)
		const callArgs = fetchMock.mock.calls[0]
		const init = callArgs[1] as RequestInit
		const body = JSON.parse(init.body as string) as Record<string, unknown>
		expect(body.name).toBeUndefined()
	})
})
