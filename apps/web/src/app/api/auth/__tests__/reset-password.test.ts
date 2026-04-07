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
	mockHashPassword,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockHashPassword: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/identity/password', () => ({
	hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../auth/reset-password/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/reset-password', body)
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

describe('POST /api/auth/reset-password', () => {
	beforeEach(() => {
		mockHashPassword.mockResolvedValue('$2a$12$newhashedpassword')
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('resets password with valid token', async () => {
		setupDbChain([{ id: 'user-uuid', email: 'user@example.com' }])

		const res = await POST(
			makeRequest({
				token: 'valid-reset-token',
				password: 'newpassword123',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		// Should hash the new password
		expect(mockHashPassword).toHaveBeenCalledWith('newpassword123')

		// Should update user with new hash and clear reset token
		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				passwordHash: '$2a$12$newhashedpassword',
				resetToken: null,
				resetTokenExpiresAt: null,
			}),
		)
	})

	it('rejects expired token with 401', async () => {
		// No user found (token expired or invalid -- the WHERE clause filters expired tokens)
		setupDbChain([])

		const res = await POST(
			makeRequest({
				token: 'expired-token',
				password: 'newpassword123',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
		expect(json.error.message).toBe('Invalid or expired reset link')
	})

	it('rejects invalid (non-existent) token with 401', async () => {
		setupDbChain([])

		const res = await POST(
			makeRequest({
				token: 'nonexistent-token',
				password: 'newpassword123',
			}),
		)

		expect(res.status).toBe(401)
	})

	it('clears reset token after successful use', async () => {
		setupDbChain([{ id: 'user-uuid', email: 'user@example.com' }])

		await POST(
			makeRequest({
				token: 'valid-token',
				password: 'newpassword123',
			}),
		)

		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				resetToken: null,
				resetTokenExpiresAt: null,
			}),
		)
	})

	it('rejects short new password with 400', async () => {
		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: 'short',
			}),
		)

		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects missing token with 400', async () => {
		const res = await POST(
			makeRequest({
				password: 'newpassword123',
			}),
		)

		expect(res.status).toBe(400)
	})

	it('rejects empty token with 400', async () => {
		const res = await POST(
			makeRequest({
				token: '',
				password: 'newpassword123',
			}),
		)

		expect(res.status).toBe(400)
	})

	it('rejects missing password with 400', async () => {
		const res = await POST(
			makeRequest({
				token: 'valid-token',
			}),
		)

		expect(res.status).toBe(400)
	})

	it('does not update DB when token is invalid', async () => {
		setupDbChain([])

		await POST(
			makeRequest({
				token: 'invalid-token',
				password: 'newpassword123',
			}),
		)

		// update should not be called
		expect(mockDbUpdate).not.toHaveBeenCalled()
		expect(mockHashPassword).not.toHaveBeenCalled()
	})

	it('returns 500 on unexpected error', async () => {
		mockDbSelect.mockImplementation(() => {
			throw new Error('DB error')
		})

		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: 'newpassword123',
			}),
		)

		expect(res.status).toBe(500)
		const json = await res.json()
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
