import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
	mockDbSelect,
	mockDbUpdate,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbSet,
	mockDbUpdateWhere,
	mockSendPasswordResetEmail,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockSendPasswordResetEmail: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/email', () => ({
	sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
	getBaseUrl: () => 'http://localhost',
}))

vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-reset-token-32chars-xxxxxxxx'),
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../auth/forgot-password/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/forgot-password', body)
}

function setupDbChain(selectResult: unknown[]) {
	// select().from().where().limit()
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(selectResult)

	// update().set().where()
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue([])
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
	beforeEach(() => {
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
		mockSendPasswordResetEmail.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('returns success and sends email for existing user', async () => {
		setupDbChain([{ id: 'user-uuid' }])

		const res = await POST(makeRequest({ email: 'user@example.com' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		// Should set reset token in DB
		expect(mockDbUpdate).toHaveBeenCalled()
		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				resetToken: 'mock-reset-token-32chars-xxxxxxxx',
			}),
		)

		expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1)
		expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
			'user@example.com',
			'mock-reset-token-32chars-xxxxxxxx',
			'http://localhost',
		)
	})

	it('returns success for non-existing email (prevents enumeration)', async () => {
		setupDbChain([]) // No user found

		const res = await POST(makeRequest({ email: 'nobody@example.com' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
		// Should NOT update DB
		expect(mockDbUpdate).not.toHaveBeenCalled()
	})

	it('sets reset token expiry to approximately 1 hour from now', async () => {
		setupDbChain([{ id: 'user-uuid' }])

		const before = Date.now()
		await POST(makeRequest({ email: 'user@example.com' }))
		const after = Date.now()

		const setCall = mockDbSet.mock.calls[0][0]
		const expiresAt = setCall.resetTokenExpiresAt as Date
		const expiryMs = expiresAt.getTime()

		// Should be approximately 1 hour from now (within 5 seconds tolerance)
		const oneHourMs = 60 * 60 * 1000
		expect(expiryMs).toBeGreaterThanOrEqual(before + oneHourMs - 5000)
		expect(expiryMs).toBeLessThanOrEqual(after + oneHourMs + 5000)
	})

	it('rejects invalid email with 400', async () => {
		const res = await POST(makeRequest({ email: 'not-an-email' }))
		expect(res.status).toBe(400)

		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects missing email with 400', async () => {
		const res = await POST(makeRequest({}))
		expect(res.status).toBe(400)
	})

	it('returns 500 on unexpected error', async () => {
		mockDbSelect.mockImplementation(() => {
			throw new Error('DB failure')
		})

		const res = await POST(makeRequest({ email: 'user@example.com' }))
		expect(res.status).toBe(500)

		const json = await res.json()
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
