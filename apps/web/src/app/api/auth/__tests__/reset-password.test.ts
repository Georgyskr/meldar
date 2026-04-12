import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashToken } from '@/server/identity/token-hash'

const { mockDbUpdate, mockDbSet, mockDbUpdateWhere, mockDbReturning, mockHashPassword } =
	vi.hoisted(() => ({
		mockDbUpdate: vi.fn(),
		mockDbSet: vi.fn(),
		mockDbUpdateWhere: vi.fn(),
		mockDbReturning: vi.fn(),
		mockHashPassword: vi.fn(),
	}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/identity/password', () => ({
	hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}))

import { POST } from '../../auth/reset-password/route'

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/auth/reset-password', body)
}

function flattenDrizzleExpr(expr: unknown, seen = new WeakSet()): string[] {
	if (expr === null || expr === undefined) return []
	if (typeof expr === 'string') return [expr]
	if (typeof expr === 'number' || typeof expr === 'boolean') return [String(expr)]
	if (typeof expr !== 'object') return []
	if (seen.has(expr as object)) return []
	seen.add(expr as object)
	const results: string[] = []
	if (Array.isArray(expr)) {
		for (const item of expr) results.push(...flattenDrizzleExpr(item, seen))
	} else {
		for (const val of Object.values(expr as Record<string, unknown>)) {
			results.push(...flattenDrizzleExpr(val, seen))
		}
	}
	return results
}

function setupAtomicUpdate(returningResult: unknown[]) {
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockReturnValue({ returning: mockDbReturning })
	mockDbReturning.mockResolvedValue(returningResult)
}

describe('POST /api/auth/reset-password', () => {
	beforeEach(() => {
		mockHashPassword.mockResolvedValue('$2a$12$newhashedpassword')
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('resets password with valid token using atomic update', async () => {
		setupAtomicUpdate([{ id: 'user-uuid' }])

		const res = await POST(
			makeRequest({
				token: 'valid-reset-token',
				password: 'NewPass123',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(mockHashPassword).toHaveBeenCalledWith('NewPass123')

		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({
				passwordHash: '$2a$12$newhashedpassword',
				resetToken: null,
				resetTokenExpiresAt: null,
			}),
		)
	})

	it('uses a single atomic UPDATE...RETURNING (no separate SELECT)', async () => {
		setupAtomicUpdate([{ id: 'user-uuid' }])

		await POST(
			makeRequest({
				token: 'valid-token',
				password: 'NewPass123',
			}),
		)

		expect(mockDbUpdate).toHaveBeenCalledTimes(1)
		expect(mockDbReturning).toHaveBeenCalled()
	})

	it('hashes the incoming token before DB lookup', async () => {
		const rawToken = 'raw-token-from-email-link'
		const expectedHash = hashToken(rawToken)

		setupAtomicUpdate([{ id: 'user-uuid' }])

		await POST(
			makeRequest({
				token: rawToken,
				password: 'NewPass123',
			}),
		)

		expect(mockDbUpdateWhere).toHaveBeenCalled()
		const whereArg = mockDbUpdateWhere.mock.calls[0][0]
		const flat = flattenDrizzleExpr(whereArg)
		expect(flat).toContain(expectedHash)
		expect(flat).not.toContain(rawToken)
	})

	it('returns 401 when token was already consumed (atomic prevents race)', async () => {
		setupAtomicUpdate([])

		const res = await POST(
			makeRequest({
				token: 'already-used-token',
				password: 'NewPass123',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
		expect(json.error.message).toBe('Invalid or expired reset link')
	})

	it('rejects expired token with 401', async () => {
		setupAtomicUpdate([])

		const res = await POST(
			makeRequest({
				token: 'expired-token',
				password: 'NewPass123',
			}),
		)

		const json = await res.json()
		expect(res.status).toBe(401)
		expect(json.error.code).toBe('UNAUTHORIZED')
	})

	it('clears reset token atomically on success', async () => {
		setupAtomicUpdate([{ id: 'user-uuid' }])

		await POST(
			makeRequest({
				token: 'valid-token',
				password: 'NewPass123',
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

	it('returns 400 with INVALID_JSON for malformed JSON body', async () => {
		const req = new Request('http://localhost/api/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain' },
			body: 'not json',
		}) as unknown as NextRequest

		const res = await POST(req)
		const json = await res.json()
		expect(res.status).toBe(400)
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('rejects missing token with 400', async () => {
		const res = await POST(
			makeRequest({
				password: 'NewPass123',
			}),
		)

		expect(res.status).toBe(400)
	})

	it('rejects empty token with 400', async () => {
		const res = await POST(
			makeRequest({
				token: '',
				password: 'NewPass123',
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

	it('rejects all-lowercase password', async () => {
		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: 'password',
			}),
		)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects all-digit password', async () => {
		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: '12345678',
			}),
		)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('accepts strong password', async () => {
		setupAtomicUpdate([{ id: 'user-uuid' }])
		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: 'Str0ngPass',
			}),
		)
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.success).toBe(true)
	})

	it('returns 500 on unexpected error', async () => {
		mockDbUpdate.mockImplementation(() => {
			throw new Error('DB error')
		})

		const res = await POST(
			makeRequest({
				token: 'valid-token',
				password: 'NewPass123',
			}),
		)

		expect(res.status).toBe(500)
		const json = await res.json()
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
