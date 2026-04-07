import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/jwt', () => ({
	verifyToken: vi.fn((token: string) => {
		if (token === 'valid_token') return { userId: 'user_1', email: 'u@x.com' }
		return null
	}),
}))

const { mockCreditTokens, mockGetTokenBalance } = vi.hoisted(() => ({
	mockCreditTokens: vi.fn(),
	mockGetTokenBalance: vi.fn(),
}))

vi.mock('@meldar/tokens', () => ({
	creditTokens: mockCreditTokens,
	getTokenBalance: mockGetTokenBalance,
	DEFAULT_TOKEN_ECONOMY: {
		signupBonus: 200,
		dailyEarnCap: 15,
		referralBonus: 50,
		freeMonthlyAllowance: 200,
	},
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({})),
}))

const { mockRedisSet, mockRedisDel } = vi.hoisted(() => ({
	mockRedisSet: vi.fn(),
	mockRedisDel: vi.fn(),
}))

vi.mock('@upstash/redis', () => ({
	Redis: class MockRedis {
		set = mockRedisSet
		del = mockRedisDel
	},
}))

const { mockCheckRateLimit } = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	claimDailyLimit: null,
}))

const { POST } = await import('../route')

function makeRequest(opts: { cookie?: string }): NextRequest {
	const headers = new Headers()
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	return new NextRequest('http://localhost/api/workspace/tokens/claim-daily', {
		method: 'POST',
		headers,
	})
}

describe('POST /api/workspace/tokens/claim-daily', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCheckRateLimit.mockResolvedValue({ success: true })
		vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io')
		vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake_token')
	})

	it('returns 401 when no auth cookie is present', async () => {
		const res = await POST(makeRequest({}))
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns alreadyClaimed when Redis NX set returns null', async () => {
		mockRedisSet.mockResolvedValue(null)
		mockGetTokenBalance.mockResolvedValue(200)

		const res = await POST(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as { alreadyClaimed: boolean; balance: number }
		expect(json.alreadyClaimed).toBe(true)
		expect(json.balance).toBe(200)
		expect(mockCreditTokens).not.toHaveBeenCalled()
	})

	it('credits daily bonus on first claim', async () => {
		mockRedisSet.mockResolvedValue('OK')
		mockCreditTokens.mockResolvedValue({ balance: 215 })

		const res = await POST(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as {
			alreadyClaimed: boolean
			credited: number
			balance: number
		}
		expect(json.alreadyClaimed).toBe(false)
		expect(json.credited).toBe(15)
		expect(json.balance).toBe(215)
		expect(mockCreditTokens).toHaveBeenCalledWith(expect.anything(), 'user_1', 15, 'daily_bonus')
	})

	it('calls Redis SET with nx and 86400s expiry', async () => {
		mockRedisSet.mockResolvedValue('OK')
		mockCreditTokens.mockResolvedValue({ balance: 215 })

		await POST(makeRequest({ cookie: 'valid_token' }))
		expect(mockRedisSet).toHaveBeenCalledWith(
			expect.stringContaining('meldar:daily-bonus:user_1:'),
			'1',
			{ ex: 86400, nx: true },
		)
	})

	it('returns 503 when rate limiter reports serviceError', async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, serviceError: true })

		const res = await POST(makeRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(503)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('SERVICE_UNAVAILABLE')
	})

	it('deletes Redis key when creditTokens fails', async () => {
		mockRedisSet.mockResolvedValue('OK')
		mockRedisDel.mockResolvedValue(1)
		mockCreditTokens.mockRejectedValue(new Error('DB unavailable'))

		await expect(POST(makeRequest({ cookie: 'valid_token' }))).rejects.toThrow('DB unavailable')
		expect(mockRedisDel).toHaveBeenCalledWith(expect.stringContaining('meldar:daily-bonus:user_1:'))
	})
})
