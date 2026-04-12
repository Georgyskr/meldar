import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashToken } from '@/server/identity/token-hash'

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

import { POST } from '../../auth/forgot-password/route'

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/forgot-password', body)
}

function setupDbChain(selectResult: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(selectResult)

	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue([])
}

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

		expect(mockDbUpdate).toHaveBeenCalled()
		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				resetToken: hashToken('mock-reset-token-32chars-xxxxxxxx'),
			}),
		)

		expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1)
		expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
			'user@example.com',
			'mock-reset-token-32chars-xxxxxxxx',
			'http://localhost',
		)
	})

	it('stores a SHA-256 hash in DB, not the raw token', async () => {
		setupDbChain([{ id: 'user-uuid' }])

		await POST(makeRequest({ email: 'user@example.com' }))

		const storedToken = mockDbSet.mock.calls[0][0].resetToken as string
		expect(storedToken).toMatch(/^[a-f0-9]{64}$/)
		expect(storedToken).not.toBe('mock-reset-token-32chars-xxxxxxxx')
	})

	it('returns success for non-existing email (prevents enumeration)', async () => {
		setupDbChain([]) // No user found

		const res = await POST(makeRequest({ email: 'nobody@example.com' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
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

		const oneHourMs = 60 * 60 * 1000
		expect(expiryMs).toBeGreaterThanOrEqual(before + oneHourMs - 5000)
		expect(expiryMs).toBeLessThanOrEqual(after + oneHourMs + 5000)
	})

	it('takes at least 500ms regardless of whether user exists', async () => {
		setupDbChain([])

		const start = Date.now()
		await POST(makeRequest({ email: 'nobody@example.com' }))
		const elapsed = Date.now() - start

		expect(elapsed).toBeGreaterThanOrEqual(450)
	})

	it('returns 400 with INVALID_JSON for malformed JSON body', async () => {
		const req = new Request('http://localhost/api/auth/forgot-password', {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain' },
			body: 'not json',
		}) as unknown as NextRequest

		const res = await POST(req)
		const json = await res.json()
		expect(res.status).toBe(400)
		expect(json.error.code).toBe('INVALID_JSON')
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
