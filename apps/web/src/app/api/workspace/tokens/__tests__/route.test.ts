import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: vi.fn(async (request: Request) => {
		const cookie = request.headers.get('cookie')
		const match = cookie?.match(/meldar-auth=([^;]+)/)
		if (match?.[1] === 'valid_token') {
			return { ok: true, userId: 'user_1', email: 'u@x.com', emailVerified: true }
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

const { mockGetTokenBalance, mockGetTransactionHistory, mockCheckRateLimit } = vi.hoisted(() => ({
	mockGetTokenBalance: vi.fn(),
	mockGetTransactionHistory: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
}))

vi.mock('@meldar/tokens', () => ({
	getTokenBalance: mockGetTokenBalance,
	getTransactionHistory: mockGetTransactionHistory,
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({})),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	tokenReadLimit: null,
}))

const { GET } = await import('../route')

function makeRequest(opts: { cookie?: string }): NextRequest {
	const headers = new Headers()
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	return new NextRequest('http://localhost/api/workspace/tokens', {
		method: 'GET',
		headers,
	})
}

describe('GET /api/workspace/tokens', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCheckRateLimit.mockResolvedValue({ success: true })
	})

	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeRequest({}))
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when auth cookie is invalid', async () => {
		const res = await GET(makeRequest({ cookie: 'bad_token' }))
		expect(res.status).toBe(401)
	})

	it('calls getTokenBalance with correct userId', async () => {
		mockGetTokenBalance.mockResolvedValue(150)
		mockGetTransactionHistory.mockResolvedValue([])

		await GET(makeRequest({ cookie: 'valid_token' }))

		expect(mockGetTokenBalance).toHaveBeenCalledTimes(1)
		expect(mockGetTokenBalance.mock.calls[0][1]).toBe('user_1')
	})

	it('calls getTransactionHistory with correct userId and limit', async () => {
		mockGetTokenBalance.mockResolvedValue(150)
		mockGetTransactionHistory.mockResolvedValue([])

		await GET(makeRequest({ cookie: 'valid_token' }))

		expect(mockGetTransactionHistory).toHaveBeenCalledTimes(1)
		expect(mockGetTransactionHistory.mock.calls[0][1]).toBe('user_1')
		expect(mockGetTransactionHistory.mock.calls[0][2]).toBe(20)
	})

	it('returns balance and transactions when authenticated', async () => {
		const now = new Date()
		mockGetTokenBalance.mockResolvedValue(150)
		mockGetTransactionHistory.mockResolvedValue([
			{
				id: 'txn_1',
				userId: 'user_1',
				amount: -10,
				reason: 'build',
				referenceId: 'build_1',
				balanceAfter: 190,
				createdAt: now,
			},
		])

		const res = await GET(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as { balance: number; transactions: unknown[] }
		expect(json.balance).toBe(150)
		expect(json.transactions).toHaveLength(1)
	})

	it('returns 500 when getTokenBalance throws', async () => {
		mockGetTokenBalance.mockRejectedValue(new Error('DB connection lost'))
		mockGetTransactionHistory.mockResolvedValue([])

		const res = await GET(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(500)
	})

	it('returns 429 when rate limited', async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false })

		const res = await GET(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(429)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('RATE_LIMITED')
	})
})
