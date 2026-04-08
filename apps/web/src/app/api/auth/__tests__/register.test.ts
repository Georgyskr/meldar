import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockDbInsert,
	mockDbValues,
	mockDbReturning,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
	mockSendVerificationEmail,
	mockSendWelcomeEmail,
} = vi.hoisted(() => ({
	mockDbInsert: vi.fn(),
	mockDbValues: vi.fn(),
	mockDbReturning: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockSendVerificationEmail: vi.fn(),
	mockSendWelcomeEmail: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		insert: mockDbInsert,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/identity/jwt', () => ({
	signToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/server/identity/password', () => ({
	hashPassword: vi.fn(() => Promise.resolve('$2a$12$mockhashedpassword')),
}))

vi.mock('@/server/email', () => ({
	sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
	sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
	getBaseUrl: () => 'http://localhost',
}))

vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-verify-token-32chars-xxxxxxx'),
}))

import { POST } from '../../auth/register/route'

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/register', body)
}

function setupDbChain() {
	mockDbInsert.mockReturnValue({ values: mockDbValues })
	const valuesResult = Object.assign(Promise.resolve(), { returning: mockDbReturning })
	mockDbValues.mockReturnValue(valuesResult)
	mockDbReturning.mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440000' }])
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue([])
}

describe('POST /api/auth/register', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', 'test-secret')
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
		setupDbChain()
		mockSendVerificationEmail.mockResolvedValue(undefined)
		mockSendWelcomeEmail.mockResolvedValue(undefined)
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

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
		expect(setCookie).toContain('HttpOnly')
		expect(setCookie).toContain('Path=/')
	})

	it('includes verifyToken and verifyTokenExpiresAt in insert payload', async () => {
		await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
			}),
		)

		expect(mockDbValues).toHaveBeenCalledWith(
			expect.objectContaining({
				verifyToken: 'mock-verify-token-32chars-xxxxxxx',
				verifyTokenExpiresAt: expect.any(Date),
			}),
		)

		const insertPayload = mockDbValues.mock.calls[0][0]
		const expiresAt = insertPayload.verifyTokenExpiresAt as Date
		const twentyFourHoursMs = 24 * 60 * 60 * 1000
		expect(expiresAt.getTime()).toBeGreaterThanOrEqual(Date.now() + twentyFourHoursMs - 5000)
		expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + twentyFourHoursMs + 5000)
	})

	it('sends verification email via Resend after registration', async () => {
		await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
			}),
		)

		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1)
		expect(mockSendVerificationEmail).toHaveBeenCalledWith(
			'new@example.com',
			'mock-verify-token-32chars-xxxxxxx',
			'http://localhost',
		)
	})

	it('registration succeeds even if Resend throws', async () => {
		mockSendVerificationEmail.mockRejectedValueOnce(new Error('Resend API down'))

		const res = await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(json.userId).toBe('550e8400-e29b-41d4-a716-446655440000')

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
	})

	it('rejects duplicate email with generic 400', async () => {
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
		expect(res.status).toBe(400)
		expect(json.error.code).toBe('REGISTRATION_FAILED')
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

	it('returns 500 on unexpected error', async () => {
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

	it('sends welcome email after registration', async () => {
		await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
				name: 'Test User',
			}),
		)

		expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1)
		expect(mockSendWelcomeEmail).toHaveBeenCalledWith('new@example.com', 'Test User')
	})

	it('sends welcome email with null name when name not provided', async () => {
		await POST(
			makeRequest({
				email: 'noname@example.com',
				password: 'securepassword',
			}),
		)

		expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1)
		expect(mockSendWelcomeEmail).toHaveBeenCalledWith('noname@example.com', null)
	})

	it('registration succeeds even if welcome email throws', async () => {
		mockSendWelcomeEmail.mockRejectedValueOnce(new Error('Resend API down'))

		const res = await POST(
			makeRequest({
				email: 'new@example.com',
				password: 'securepassword',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
	})
})
