import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDbSelect, mockDbFrom, mockDbWhere, mockDbLimit, mockVerifyPassword } = vi.hoisted(
	() => ({
		mockDbSelect: vi.fn(),
		mockDbFrom: vi.fn(),
		mockDbWhere: vi.fn(),
		mockDbLimit: vi.fn(),
		mockVerifyPassword: vi.fn(),
	}),
)

vi.mock('@/server/db/client', () => ({
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

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../auth/login/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return new Request('http://localhost/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}) as unknown as NextRequest
}

const fakeUser = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	email: 'user@example.com',
	name: 'Test User',
	passwordHash: '$2a$12$hashedpassword',
	emailVerified: true,
	xrayUsageCount: 3,
	verifyToken: null,
	resetToken: null,
	resetTokenExpiresAt: null,
	marketingConsent: false,
	createdAt: new Date(),
}

function setupDbChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', 'test-secret')
		setupDbChain([fakeUser])
		mockVerifyPassword.mockResolvedValue(true)
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
		expect(json.user.emailVerified).toBe(true)
		expect(json.user.xrayUsageCount).toBe(3)

		// Verify password hash is NOT in response
		expect(json.user.passwordHash).toBeUndefined()

		// Check JWT cookie
		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
		expect(setCookie).toContain('HttpOnly')
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
		setupDbChain([]) // No user found

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
		// Wrong password
		mockVerifyPassword.mockResolvedValue(false)
		const res1 = await POST(
			makeRequest({
				email: 'user@example.com',
				password: 'wrong',
			}),
		)
		const json1 = await res1.json()

		// Non-existent email
		setupDbChain([])
		const res2 = await POST(
			makeRequest({
				email: 'noone@example.com',
				password: 'any',
			}),
		)
		const json2 = await res2.json()

		// Same status and message (prevents email enumeration)
		expect(res1.status).toBe(res2.status)
		expect(json1.error.message).toBe(json2.error.message)
	})

	it('rejects invalid input with 400', async () => {
		// Missing email
		const res1 = await POST(makeRequest({ password: 'something' }))
		expect(res1.status).toBe(400)

		// Invalid email
		const res2 = await POST(
			makeRequest({
				email: 'not-email',
				password: 'something',
			}),
		)
		expect(res2.status).toBe(400)

		// Missing password
		const res3 = await POST(makeRequest({ email: 'valid@email.com' }))
		expect(res3.status).toBe(400)

		// Empty body
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
})
