import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockVerifyToken, mockDbSelect, mockDbFrom, mockDbWhere, mockDbLimit } = vi.hoisted(() => ({
	mockVerifyToken: vi.fn(),
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	users: Symbol('users'),
}))

vi.mock('../jwt', () => ({
	verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

import { requireAuth } from '../require-auth'

function makeRequest(cookie?: string): Request {
	const headers = new Headers()
	if (cookie) {
		headers.set('cookie', cookie)
	}
	return new Request('http://localhost/api/test', { headers })
}

function setupDbChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

const validPayload = {
	userId: '550e8400-e29b-41d4-a716-446655440000',
	email: 'user@example.com',
	emailVerified: true,
	tokenVersion: 1,
}

const dbUser = {
	id: validPayload.userId,
	email: validPayload.email,
	emailVerified: true,
	tokenVersion: 1,
}

describe('requireAuth', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', 'test-secret-key-minimum-32-chars!')
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('returns 401 when no cookie present', async () => {
		const result = await requireAuth(makeRequest())

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(401)
			const json = await result.response.json()
			expect(json.error.code).toBe('UNAUTHENTICATED')
		}
	})

	it('returns 401 when cookie has invalid JWT', async () => {
		mockVerifyToken.mockReturnValue(null)

		const result = await requireAuth(makeRequest('meldar-auth=garbage-token'))

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(401)
			const json = await result.response.json()
			expect(json.error.code).toBe('UNAUTHENTICATED')
		}
	})

	it('returns 401 when JWT is expired', async () => {
		mockVerifyToken.mockReturnValue(null)

		const result = await requireAuth(makeRequest('meldar-auth=expired-token'))

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(401)
			const json = await result.response.json()
			expect(json.error.code).toBe('UNAUTHENTICATED')
		}
	})

	it('returns 401 when tokenVersion in JWT does not match DB', async () => {
		mockVerifyToken.mockReturnValue(validPayload)
		setupDbChain([{ ...dbUser, tokenVersion: 2 }])

		const result = await requireAuth(makeRequest('meldar-auth=valid-token'))

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(401)
			const json = await result.response.json()
			expect(json.error.code).toBe('UNAUTHENTICATED')
		}
	})

	it('returns session object when token is valid and tokenVersion matches', async () => {
		mockVerifyToken.mockReturnValue(validPayload)
		setupDbChain([dbUser])

		const result = await requireAuth(makeRequest('meldar-auth=valid-token'))

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.userId).toBe(validPayload.userId)
			expect(result.email).toBe(validPayload.email)
			expect(result.emailVerified).toBe(true)
		}
	})

	it('returns 401 when user does not exist in DB (deleted account)', async () => {
		mockVerifyToken.mockReturnValue(validPayload)
		setupDbChain([])

		const result = await requireAuth(makeRequest('meldar-auth=valid-token'))

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(401)
			const json = await result.response.json()
			expect(json.error.code).toBe('UNAUTHENTICATED')
		}
	})

	it('propagates DB errors (fail-closed)', async () => {
		mockVerifyToken.mockReturnValue(validPayload)
		mockDbSelect.mockImplementation(() => {
			throw new Error('Connection refused')
		})

		await expect(requireAuth(makeRequest('meldar-auth=valid-token'))).rejects.toThrow(
			'Connection refused',
		)
	})
})
