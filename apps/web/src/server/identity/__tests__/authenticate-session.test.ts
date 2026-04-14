import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockVerifyToken, mockDbSelect, mockDbFrom, mockDbWhere, mockDbLimit, mockConsoleWarn } =
	vi.hoisted(() => ({
		mockVerifyToken: vi.fn(),
		mockDbSelect: vi.fn(),
		mockDbFrom: vi.fn(),
		mockDbWhere: vi.fn(),
		mockDbLimit: vi.fn(),
		mockConsoleWarn: vi.fn(),
	}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({ select: mockDbSelect }),
}))

vi.mock('@meldar/db/schema', () => ({
	users: Symbol('users'),
}))

vi.mock('../jwt', () => ({
	verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

import { authenticateSession } from '../authenticate-session'

function setupDbChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

const jwtPayload = {
	userId: '550e8400-e29b-41d4-a716-446655440000',
	email: 'old@example.com',
	emailVerified: false,
	tokenVersion: 7,
}

describe('authenticateSession', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns { state: "invalid" } for null cookie', async () => {
		const result = await authenticateSession(null)
		expect(result).toEqual({ state: 'invalid' })
		expect(mockVerifyToken).not.toHaveBeenCalled()
		expect(mockDbSelect).not.toHaveBeenCalled()
	})

	it('returns { state: "invalid" } for undefined cookie', async () => {
		const result = await authenticateSession(undefined)
		expect(result).toEqual({ state: 'invalid' })
	})

	it('returns { state: "invalid" } for empty string', async () => {
		const result = await authenticateSession('')
		expect(result).toEqual({ state: 'invalid' })
	})

	it('returns { state: "invalid" } when JWT signature fails', async () => {
		mockVerifyToken.mockReturnValue(null)
		const result = await authenticateSession('garbage.jwt')
		expect(result).toEqual({ state: 'invalid' })
		expect(mockDbSelect).not.toHaveBeenCalled()
	})

	it('returns { state: "stale" } when user no longer exists (deleted/revoked)', async () => {
		mockVerifyToken.mockReturnValue(jwtPayload)
		setupDbChain([])
		const result = await authenticateSession('valid.jwt')
		expect(result).toEqual({ state: 'stale' })
	})

	it('returns { state: "stale" } when tokenVersion in JWT is older than DB (forced invalidation)', async () => {
		mockVerifyToken.mockReturnValue(jwtPayload)
		setupDbChain([
			{ tokenVersion: jwtPayload.tokenVersion + 1, email: jwtPayload.email, emailVerified: true },
		])
		const result = await authenticateSession('valid.jwt')
		expect(result).toEqual({ state: 'stale' })
	})

	it('returns { state: "stale" } when tokenVersion in JWT is newer than DB (corruption)', async () => {
		mockVerifyToken.mockReturnValue(jwtPayload)
		setupDbChain([
			{ tokenVersion: jwtPayload.tokenVersion - 1, email: jwtPayload.email, emailVerified: true },
		])
		const result = await authenticateSession('valid.jwt')
		expect(result).toEqual({ state: 'stale' })
	})

	it('returns { state: "valid", session } with DB-fresh email and emailVerified', async () => {
		mockVerifyToken.mockReturnValue(jwtPayload)
		// JWT says emailVerified: false, email: old@. DB says true / new@.
		// The helper must prefer the DB values.
		setupDbChain([
			{
				tokenVersion: jwtPayload.tokenVersion,
				email: 'new@example.com',
				emailVerified: true,
			},
		])
		const result = await authenticateSession('valid.jwt')
		expect(result).toEqual({
			state: 'valid',
			session: {
				userId: jwtPayload.userId,
				email: 'new@example.com',
				emailVerified: true,
				tokenVersion: jwtPayload.tokenVersion,
			},
		})
	})

	it('propagates DB errors so callers can fail-closed explicitly', async () => {
		mockVerifyToken.mockReturnValue(jwtPayload)
		mockDbSelect.mockImplementation(() => {
			throw new Error('Neon: connection refused')
		})
		await expect(authenticateSession('valid.jwt')).rejects.toThrow('Neon: connection refused')
	})

	it('logs a warning when a JWT-valid cookie is rejected for tokenVersion mismatch', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn)
		mockVerifyToken.mockReturnValue(jwtPayload)
		setupDbChain([
			{ tokenVersion: jwtPayload.tokenVersion + 1, email: jwtPayload.email, emailVerified: true },
		])

		await authenticateSession('valid.jwt')

		expect(mockConsoleWarn).toHaveBeenCalled()
		const msg = mockConsoleWarn.mock.calls[0].join(' ')
		expect(msg).toContain(jwtPayload.userId)
		expect(msg.toLowerCase()).toMatch(/stale|forced|tokenversion|invalidation/)
		warnSpy.mockRestore()
	})

	it('does NOT log when cookie is missing or JWT is invalid (not a security event)', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn)
		mockVerifyToken.mockReturnValue(null)
		await authenticateSession('bad.jwt')
		expect(mockConsoleWarn).not.toHaveBeenCalled()
		warnSpy.mockRestore()
	})
})
