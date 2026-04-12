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
	mockSendVerificationEmail,
	mockGetUserFromRequest,
	mockLimiterLimit,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockSendVerificationEmail: vi.fn(),
	mockGetUserFromRequest: vi.fn(),
	mockLimiterLimit: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/email', () => ({
	sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
	getBaseUrl: () => 'http://localhost',
}))

vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-verify-token-32chars-xxxxxxx'),
}))

vi.mock('@/server/identity/jwt', () => ({
	getUserFromRequest: (...args: unknown[]) => mockGetUserFromRequest(...args),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	resendVerifyLimit: 'mock-limiter',
	mustHaveRateLimit: () => ({ limit: (...args: unknown[]) => mockLimiterLimit(...args) }),
	checkRateLimit: (..._args: unknown[]) => mockLimiterLimit(),
}))

import { POST } from '../../auth/resend-verification/route'

function makeRequest(): NextRequest {
	return new Request('http://localhost/api/auth/resend-verification', {
		method: 'POST',
		headers: {
			cookie: 'meldar-auth=mock-jwt-token',
		},
	}) as unknown as NextRequest
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

describe('POST /api/auth/resend-verification', () => {
	beforeEach(() => {
		vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
		mockSendVerificationEmail.mockResolvedValue(undefined)
		mockLimiterLimit.mockResolvedValue({ success: true })
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('returns 401 when unauthenticated', async () => {
		mockGetUserFromRequest.mockReturnValue(null)

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
	})

	it('returns 429 when rate limited', async () => {
		mockGetUserFromRequest.mockReturnValue({ userId: 'user-uuid', email: 'user@example.com' })
		mockLimiterLimit.mockResolvedValue({ success: false })

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(429)
		expect(json.error.code).toBe('RATE_LIMITED')
	})

	it('returns success no-op when already verified', async () => {
		mockGetUserFromRequest.mockReturnValue({ userId: 'user-uuid', email: 'user@example.com' })
		setupDbChain([{ id: 'user-uuid', emailVerified: true }])

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(mockSendVerificationEmail).not.toHaveBeenCalled()
		expect(mockDbUpdate).not.toHaveBeenCalled()
	})

	it('generates new token and sends email when not verified', async () => {
		mockGetUserFromRequest.mockReturnValue({ userId: 'user-uuid', email: 'user@example.com' })
		setupDbChain([{ id: 'user-uuid', emailVerified: false }])

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(mockDbUpdate).toHaveBeenCalled()
		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				verifyToken: hashToken('mock-verify-token-32chars-xxxxxxx'),
				verifyTokenExpiresAt: expect.any(Date),
			}),
		)

		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1)
		expect(mockSendVerificationEmail).toHaveBeenCalledWith(
			'user@example.com',
			'mock-verify-token-32chars-xxxxxxx',
			'http://localhost',
		)
	})

	it('returns 401 when user not found in DB', async () => {
		mockGetUserFromRequest.mockReturnValue({ userId: 'ghost-uuid', email: 'ghost@example.com' })
		setupDbChain([])

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
	})

	it('returns 500 on unexpected error', async () => {
		mockGetUserFromRequest.mockReturnValue({ userId: 'user-uuid', email: 'user@example.com' })
		mockDbSelect.mockImplementation(() => {
			throw new Error('DB failure')
		})

		const res = await POST(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(500)
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
