import { makeNextRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: vi.fn(async (request: Request) => {
		const cookie = request.headers.get('cookie')
		const match = cookie?.match(/meldar-auth=([^;]+)/)
		if (match?.[1] === 'valid-token') {
			return { ok: true, userId: 'user-uuid', email: 'user@example.com', emailVerified: true }
		}
		return {
			ok: false,
			response: NextResponse.json(
				{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
				{ status: 401 },
			),
		}
	}),
}))

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: vi.fn(() => Promise.resolve({ success: true })),
	mustHaveRateLimit: vi.fn((limiter: unknown) => limiter),
	meLimit: null,
}))

import { DELETE, GET } from '../../auth/me/route'

function makeGetRequest(cookie?: string): NextRequest {
	const headers: Record<string, string> = {}
	if (cookie) headers.cookie = cookie
	return makeNextRequest('http://localhost/api/auth/me', {
		method: 'GET',
		headers,
	})
}

function makeDeleteRequest(cookie?: string): NextRequest {
	const headers: Record<string, string> = {}
	if (cookie) headers.cookie = cookie
	return makeNextRequest('http://localhost/api/auth/me', {
		method: 'DELETE',
		headers,
	})
}

function setupDbChain() {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue([])

	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue([])
}

describe('GET /api/auth/me', () => {
	beforeEach(() => {
		setupDbChain()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns { user: null } when unauthenticated (not 401)', async () => {
		const res = await GET(makeGetRequest())
		expect(res.status).toBe(200)

		const json = await res.json()
		expect(json.user).toBeNull()
	})

	it('returns user data when authenticated and user exists', async () => {
		mockDbLimit.mockResolvedValue([
			{ id: 'user-uuid', email: 'user@example.com', name: 'Test User' },
		])

		const res = await GET(makeGetRequest('meldar-auth=valid-token'))
		expect(res.status).toBe(200)

		const json = await res.json()
		expect(json.user).toEqual({
			id: 'user-uuid',
			email: 'user@example.com',
			name: 'Test User',
		})
	})

	it('returns { user: null } and clears cookie when user not found in DB', async () => {
		mockDbLimit.mockResolvedValue([])

		const res = await GET(makeGetRequest('meldar-auth=valid-token'))
		expect(res.status).toBe(200)

		const json = await res.json()
		expect(json.user).toBeNull()

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth')
	})
})

describe('DELETE /api/auth/me', () => {
	beforeEach(() => {
		setupDbChain()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when no valid auth cookie is present', async () => {
		const res = await DELETE(makeDeleteRequest())
		expect(res.status).toBe(401)

		const json = await res.json()
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('clears cookie and returns success when authenticated', async () => {
		const res = await DELETE(makeDeleteRequest('meldar-auth=valid-token'))
		expect(res.status).toBe(200)

		const json = await res.json()
		expect(json.success).toBe(true)

		const setCookie = res.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth')
	})

	it('increments tokenVersion in DB on logout', async () => {
		await DELETE(makeDeleteRequest('meldar-auth=valid-token'))

		expect(mockDbUpdate).toHaveBeenCalled()
		expect(mockDbSet).toHaveBeenCalledWith(
			expect.objectContaining({ tokenVersion: expect.anything() }),
		)
	})
})
