import { makeNextJsonRequest, makeNextRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockVerifyPassword,
	mockCheckRateLimit,
	mockSetAuthCookie,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockVerifyPassword: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
	mockSetAuthCookie: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
	}),
}))

vi.mock('@/server/identity/jwt', () => ({
	signToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/server/identity/password', () => ({
	verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}))

vi.mock('@/server/identity/auth-cookie', () => ({
	setAuthCookie: (...args: unknown[]) => mockSetAuthCookie(...args),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	loginLimit: null,
	loginEmailLimit: null,
	mustHaveRateLimit: () => null,
}))

import { POST } from '../../auth/login/route'

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/login', body)
}

const fakeUser = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	email: 'user@example.com',
	name: 'Test User',
	passwordHash: '$2a$12$hashedpassword',
}

function setupDbChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', 'test-secret-key-minimum-32-chars!')
		setupDbChain([fakeUser])
		mockVerifyPassword.mockResolvedValue(true)
		mockCheckRateLimit.mockResolvedValue({ success: true })
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('logs in successfully with correct credentials', async () => {
		const res = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'correctpassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(json.user.id).toBe(fakeUser.id)
		expect(json.user.email).toBe(fakeUser.email)
		expect(json.user.name).toBe(fakeUser.name)
		expect(json.user.passwordHash).toBeUndefined()

		expect(mockSetAuthCookie).toHaveBeenCalledWith(expect.anything(), 'mock-jwt-token')
	})

	it('rejects wrong password with 401', async () => {
		mockVerifyPassword.mockResolvedValue(false)

		const res = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'wrongpassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
		expect(json.error.message).toBe('Invalid email or password')
	})

	it('rejects non-existent email with 401 (same message as wrong password)', async () => {
		setupDbChain([])

		const res = await POST(
			makeRequest({
				email: 'noone@example.com',
				password: 'anypassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
		expect(json.error.message).toBe('Invalid email or password')
	})

	it('returns same error message for wrong password and non-existent email', async () => {
		mockVerifyPassword.mockResolvedValue(false)
		const res1 = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'wrong',
			}),
		)
		const json1 = await res1.json()

		setupDbChain([])
		const res2 = await POST(
			makeRequest({
				email: 'noone@example.com',
				password: 'any',
			}),
		)
		const json2 = await res2.json()

		expect(res1.status).toBe(res2.status)
		expect(json1.error.message).toBe(json2.error.message)
	})

	it('rejects invalid input with 400', async () => {
		const res1 = await POST(makeRequest({ password: 'something' }))
		expect(res1.status).toBe(400)

		const res2 = await POST(
			makeRequest({
				email: 'not-email',
				password: 'something',
			}),
		)
		expect(res2.status).toBe(400)

		const res3 = await POST(makeRequest({ email: 'valid@email.com' }))
		expect(res3.status).toBe(400)

		const res4 = await POST(makeRequest({}))
		expect(res4.status).toBe(400)
	})

	it('returns 500 on unexpected error', async () => {
		mockDbSelect.mockImplementation(() => {
			throw new Error('Database error')
		})

		const res = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'anything',
			}),
		)

		expect(res.status).toBe(500)
		const json = await res.json()
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})

	it('returns 400 with INVALID_JSON when request body is not valid JSON', async () => {
		const req = makeNextRequest('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'not-json{{{',
		})

		const res = await POST(req)
		expect(res.status).toBe(400)

		const json = await res.json()
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('calls verifyPassword even when user is not found (timing parity)', async () => {
		setupDbChain([])

		await POST(
			makeRequest({
				email: 'noone@example.com',
				password: 'anypassword',
			}),
		)

		expect(mockVerifyPassword).toHaveBeenCalledTimes(1)
	})

	it('calls setAuthCookie on successful login', async () => {
		const res = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'correctpassword',
			}),
		)

		expect(res.status).toBe(200)
		expect(mockSetAuthCookie).toHaveBeenCalledTimes(1)
		expect(mockSetAuthCookie).toHaveBeenCalledWith(expect.anything(), 'mock-jwt-token')
	})

	describe('per-email rate limiting', () => {
		it('returns 429 when the email-based rate limit is exceeded', async () => {
			mockCheckRateLimit
				.mockResolvedValueOnce({ success: true })
				.mockResolvedValueOnce({ success: false })

			const res = await POST(
				makeRequest({
					email: 'target@example.com',
					password: 'anything',
				}),
			)

			expect(res.status).toBe(429)
			const json = await res.json()
			expect(json.error.code).toBe('RATE_LIMITED')
			expect(mockCheckRateLimit).toHaveBeenCalledTimes(2)
			expect(mockCheckRateLimit.mock.calls[1][1]).toBe('target@example.com')
		})
	})
})
