import { makeNextRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbInsert,
	mockDbValues,
	mockDbReturning,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
	mockHashPassword,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbInsert: vi.fn(),
	mockDbValues: vi.fn(),
	mockDbReturning: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockHashPassword: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		insert: mockDbInsert,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/identity/jwt', () => ({
	signToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/server/identity/password', () => ({
	hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}))

vi.mock('@/server/email', () => ({
	getBaseUrl: () => 'http://localhost:3000',
}))

const mockCookieStore = {
	get: vi.fn((name: string) => (name === 'oauth_state' ? { value: 'test-state' } : undefined)),
	set: vi.fn(),
	delete: vi.fn(),
}

vi.mock('next/headers', () => ({
	cookies: vi.fn(async () => mockCookieStore),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { GET } from '../../auth/google/callback/route'

function makeCallbackRequest(params: Record<string, string>): NextRequest {
	const url = new URL('http://localhost:3000/api/auth/google/callback')
	if (!params.state) url.searchParams.set('state', 'test-state')
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value)
	}
	const req = makeNextRequest(url.toString(), { method: 'GET' })
	Object.defineProperty(req, 'nextUrl', { value: url, writable: false })
	return req
}

function setupSelectChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

function setupInsertChain() {
	mockDbInsert.mockReturnValue({ values: mockDbValues })
	const valuesResult = Object.assign(Promise.resolve(), { returning: mockDbReturning })
	mockDbValues.mockReturnValue(valuesResult)
	mockDbReturning.mockResolvedValue([{ id: 'new-user-uuid' }])
}

function setupUpdateChain() {
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue([])
}

function mockGoogleApis(email: string, name = 'Test User', verifiedEmail = true) {
	mockFetch
		.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ access_token: 'google-access-token' }),
		})
		.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ email, name, verified_email: verifiedEmail }),
		})
}

describe('GET /api/auth/google/callback', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', 'test-secret')
		vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret')
		vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
		mockHashPassword.mockResolvedValue('$2a$12$random-placeholder-hash')
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('redirects to sign-in with error when no code param', async () => {
		const res = await GET(makeCallbackRequest({}))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe(
			'http://localhost:3000/sign-in?error=google-auth-failed',
		)
	})

	it('redirects to sign-in with error when error param is present', async () => {
		const res = await GET(makeCallbackRequest({ error: 'access_denied' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe(
			'http://localhost:3000/sign-in?error=google-auth-failed',
		)
	})

	it('redirects with error when token exchange fails', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe(
			'http://localhost:3000/sign-in?error=google-token-exchange-failed',
		)
	})

	it('redirects with error when userinfo request fails', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ access_token: 'token' }),
			})
			.mockResolvedValueOnce({ ok: false, status: 401 })

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe(
			'http://localhost:3000/sign-in?error=google-userinfo-failed',
		)
	})

	it('redirects with error when Google account has no email', async () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ access_token: 'token' }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ name: 'No Email User' }),
			})

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe('http://localhost:3000/sign-in?error=google-no-email')
	})

	it('creates a new user, sets JWT cookie, and redirects to workspace', async () => {
		mockGoogleApis('new@example.com', 'New User')
		setupSelectChain([])
		setupInsertChain()

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe('http://localhost:3000/workspace')

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
		expect(setCookie).toContain('HttpOnly')
		expect(setCookie).toContain('Path=/')

		expect(mockDbInsert).toHaveBeenCalledTimes(2)

		const userInsertCall = mockDbValues.mock.calls[0][0]
		expect(userInsertCall.email).toBe('new@example.com')
		expect(userInsertCall.name).toBe('New User')
		expect(userInsertCall.emailVerified).toBe(true)
		expect(userInsertCall.passwordHash).toBe('$2a$12$random-placeholder-hash')
	})

	it('records signup bonus for new users', async () => {
		mockGoogleApis('new@example.com')
		setupSelectChain([])
		setupInsertChain()

		await GET(makeCallbackRequest({ code: 'valid-code' }))

		const bonusInsertCall = mockDbValues.mock.calls[1][0]
		expect(bonusInsertCall.amount).toBe(200)
		expect(bonusInsertCall.reason).toBe('signup_bonus')
		expect(bonusInsertCall.balanceAfter).toBe(200)
	})

	it('logs in existing Google user without creating a duplicate', async () => {
		mockGoogleApis('existing@example.com')
		setupSelectChain([
			{ id: 'existing-user-uuid', emailVerified: true, authProvider: 'google', tokenVersion: 0 },
		])

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe('http://localhost:3000/workspace')

		expect(mockDbInsert).not.toHaveBeenCalled()

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=mock-jwt-token')
	})

	it('redirects email-registered user to sign-in instead of auto-merging', async () => {
		mockGoogleApis('email-user@example.com')
		setupSelectChain([
			{ id: 'email-user-uuid', emailVerified: true, authProvider: 'email', tokenVersion: 0 },
		])

		const res = await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toBe(
			'http://localhost:3000/sign-in?error=google-account-exists',
		)
		expect(mockDbInsert).not.toHaveBeenCalled()
	})

	it('marks existing unverified Google user as verified', async () => {
		mockGoogleApis('unverified@example.com')
		setupSelectChain([
			{
				id: 'unverified-user-uuid',
				emailVerified: false,
				authProvider: 'google',
				tokenVersion: 0,
			},
		])
		setupUpdateChain()

		await GET(makeCallbackRequest({ code: 'valid-code' }))

		expect(mockDbUpdate).toHaveBeenCalled()
		expect(mockDbSet).toHaveBeenCalledWith({ emailVerified: true })
	})
})
