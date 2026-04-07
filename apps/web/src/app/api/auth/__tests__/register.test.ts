import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks (available inside vi.mock factories) ─────────────────────

const {
	mockDbSelect,
	mockDbInsert,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbValues,
	mockDbReturning,
	mockDbOnConflictDoNothing,
	mockSendEmail,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbInsert: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbValues: vi.fn(),
	mockDbReturning: vi.fn(),
	mockDbOnConflictDoNothing: vi.fn(),
	mockSendEmail: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		insert: mockDbInsert,
	}),
}))

vi.mock('resend', () => ({
	Resend: class MockResend {
		emails = { send: mockSendEmail }
	},
}))

vi.mock('@/server/identity/jwt', () => ({
	signToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/server/identity/password', () => ({
	hashPassword: vi.fn(() => Promise.resolve('$2a$12$mockhashedpassword')),
}))

vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-verify-token-32chars-xxxxxx'),
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import { POST } from '../../auth/register/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/register', body)
}

function setupDbChain(selectResult: unknown[] = []) {
	// Chain for select().from().where().limit()
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(selectResult)

	// Chain for insert().values().returning() + onConflictDoNothing
	mockDbInsert.mockReturnValue({ values: mockDbValues })
	mockDbValues.mockReturnValue({
		returning: mockDbReturning,
		onConflictDoNothing: mockDbOnConflictDoNothing,
	})
	mockDbReturning.mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440000' }])
	mockDbOnConflictDoNothing.mockResolvedValue([])
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
	beforeEach(() => {
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
		vi.stubEnv('AUTH_SECRET', 'test-secret')
		mockSendEmail.mockResolvedValue({ id: 'email-id' })
		setupDbChain([]) // No existing user by default
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('registers successfully and returns JWT cookie', async () => {
		const res = await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
				name: 'Test User',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(json.userId).toBe('550e8400-e29b-41d4-a716-446655440000')

		// Check cookie is set
		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
		expect(setCookie).toContain('HttpOnly')
		expect(setCookie).toContain('Path=/')
	})

	it('rejects duplicate email with 409', async () => {
		// The route is race-condition safe: it doesn't SELECT-then-INSERT, it
		// goes straight to INSERT and catches Postgres unique-constraint
		// violations (error code '23505'). To exercise the duplicate-email
		// path, the INSERT mock must throw an error carrying that code.
		const uniqueViolation = Object.assign(new Error('duplicate key value'), {
			code: '23505',
		})
		mockDbReturning.mockRejectedValueOnce(uniqueViolation)

		const res = await POST(
			makeRequest({
				email: 'existing@example.com',
				password: 'securepassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(409)
		expect(json.error.code).toBe('CONFLICT')
	})

	it('rejects invalid email format with 400', async () => {
		const res = await POST(
			makeRequest({
				email: 'not-an-email',
				password: 'securepassword',
			}),
		)

		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects password shorter than 8 characters with 400', async () => {
		const res = await POST(
			makeRequest({
				email: 'valid@example.com',
				password: 'short',
			}),
		)

		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects missing fields with 400', async () => {
		const res = await POST(makeRequest({}))
		expect(res.status).toBe(400)

		const res2 = await POST(makeRequest({ email: 'a@b.com' }))
		expect(res2.status).toBe(400)

		const res3 = await POST(makeRequest({ password: 'longenough' }))
		expect(res3.status).toBe(400)
	})

	it('creates subscriber record when marketingConsent is true', async () => {
		const res = await POST(
			makeRequest({
				email: 'marketing@example.com',
				password: 'securepassword',
				marketingConsent: true,
			}),
		)

		expect(res.status).toBe(200)
		// insert should be called twice: once for user, once for subscriber
		expect(mockDbInsert).toHaveBeenCalledTimes(2)
	})

	it('does not create subscriber record when marketingConsent is false', async () => {
		const res = await POST(
			makeRequest({
				email: 'nomarketing@example.com',
				password: 'securepassword',
				marketingConsent: false,
			}),
		)

		expect(res.status).toBe(200)
		// insert should be called once: only for user
		expect(mockDbInsert).toHaveBeenCalledTimes(1)
	})

	it('does not create subscriber record when marketingConsent is omitted', async () => {
		const res = await POST(
			makeRequest({
				email: 'default@example.com',
				password: 'securepassword',
			}),
		)

		expect(res.status).toBe(200)
		expect(mockDbInsert).toHaveBeenCalledTimes(1)
	})

	it('sends verification email on successful registration', async () => {
		const res = await POST(
			makeRequest({
				email: 'verify@example.com',
				password: 'securepassword',
			}),
		)

		expect(res.status).toBe(200)
		expect(mockSendEmail).toHaveBeenCalledTimes(1)
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'verify@example.com',
				subject: 'Verify your Meldar account',
			}),
		)
	})

	it('returns 500 on unexpected error', async () => {
		// The route only catches the Postgres unique-violation code ('23505');
		// any other error must bubble up and be turned into a 500 by the outer
		// try/catch. Use a generic Error (no `code` property) to exercise that
		// path. Earlier this test mocked `db.select()` which the route never
		// calls, so the failure went undetected.
		mockDbReturning.mockRejectedValueOnce(new Error('DB connection failed'))

		const res = await POST(
			makeRequest({
				email: 'error@example.com',
				password: 'securepassword',
			}),
		)

		expect(res.status).toBe(500)
		const json = await res.json()
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
