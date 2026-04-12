import { NextResponse } from 'next/server'
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
	mockRequireAuth,
	mockSignToken,
	mockSetAuthCookie,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockRequireAuth: vi.fn(),
	mockSignToken: vi.fn(() => 'refreshed-jwt'),
	mockSetAuthCookie: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/server/identity/jwt', () => ({
	signToken: (...args: unknown[]) => mockSignToken(...args),
}))

vi.mock('@/server/identity/auth-cookie', () => ({
	setAuthCookie: (...args: unknown[]) => mockSetAuthCookie(...args),
}))

import { GET } from '../../auth/verify-email/route'

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

function makeRequest(token?: string) {
	const url = token
		? `http://localhost/api/auth/verify-email?token=${token}`
		: 'http://localhost/api/auth/verify-email'
	const req = new Request(url)
	Object.defineProperty(req, 'nextUrl', { value: new URL(url) })
	return req as unknown as import('next/server').NextRequest
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

function unauthenticatedResult() {
	return {
		ok: false as const,
		response: NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		),
	}
}

describe('GET /api/auth/verify-email', () => {
	beforeEach(() => {
		mockRequireAuth.mockResolvedValue(unauthenticatedResult())
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('hashes the incoming token before DB lookup', async () => {
		const rawToken = 'raw-verify-token-from-email'
		const expectedHash = hashToken(rawToken)

		setupDbChain([{ id: 'user-uuid', email: 'user@example.com', tokenVersion: 0 }])

		await GET(makeRequest(rawToken))

		expect(mockDbWhere).toHaveBeenCalled()
		const whereArg = mockDbWhere.mock.calls[0][0]
		const flat = flattenDrizzleExpr(whereArg)
		expect(flat).toContain(expectedHash)
		expect(flat).not.toContain(rawToken)
	})

	it('redirects to workspace on valid token', async () => {
		setupDbChain([{ id: 'user-uuid', email: 'user@example.com', tokenVersion: 0 }])

		const res = await GET(makeRequest('valid-token'))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toContain('/workspace?verified=1')
	})

	it('redirects to sign-in with error on invalid token', async () => {
		setupDbChain([])

		const res = await GET(makeRequest('invalid-token'))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toContain('/sign-in?error=invalid-token')
	})

	it('redirects to sign-in when no token provided', async () => {
		const res = await GET(makeRequest())

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toContain('/sign-in?error=invalid-token')
	})

	it('does NOT issue a cookie when requireAuth fails (revoked session)', async () => {
		setupDbChain([{ id: 'user-1', email: 'u@x.com', tokenVersion: 1 }])
		mockRequireAuth.mockResolvedValue(unauthenticatedResult())

		const res = await GET(makeRequest('valid-token'))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toContain('/workspace?verified=1')
		expect(mockSetAuthCookie).not.toHaveBeenCalled()
		expect(mockSignToken).not.toHaveBeenCalled()
	})

	it('issues a refreshed cookie when requireAuth succeeds and userId matches', async () => {
		setupDbChain([{ id: 'user-1', email: 'u@x.com', tokenVersion: 1 }])
		mockRequireAuth.mockResolvedValue({
			ok: true,
			userId: 'user-1',
			email: 'u@x.com',
			emailVerified: false,
		})

		const res = await GET(makeRequest('valid-token'))

		expect(res.status).toBe(307)
		expect(res.headers.get('location')).toContain('/workspace?verified=1')
		expect(mockSignToken).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				email: 'u@x.com',
				emailVerified: true,
			}),
		)
		expect(mockSetAuthCookie).toHaveBeenCalled()
	})

	it('does NOT issue a cookie when auth userId differs from verified user', async () => {
		setupDbChain([{ id: 'user-1', email: 'u@x.com', tokenVersion: 1 }])
		mockRequireAuth.mockResolvedValue({
			ok: true,
			userId: 'different-user',
			email: 'other@x.com',
			emailVerified: true,
		})

		const res = await GET(makeRequest('valid-token'))

		expect(res.status).toBe(307)
		expect(mockSetAuthCookie).not.toHaveBeenCalled()
	})
})
