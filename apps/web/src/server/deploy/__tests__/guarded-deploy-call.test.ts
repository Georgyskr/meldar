import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockStore = new Map<string, number | string>()

const mockRedisInstance = {
	get: vi.fn(async (key: string) => mockStore.get(key) ?? null),
	incr: vi.fn(async (key: string) => {
		const current = (mockStore.get(key) as number) ?? 0
		mockStore.set(key, current + 1)
		return current + 1
	}),
	expire: vi.fn(async () => true),
}

vi.mock('@upstash/redis', () => ({
	Redis: class MockRedis {
		get = mockRedisInstance.get
		incr = mockRedisInstance.incr
		expire = mockRedisInstance.expire
	},
}))

vi.mock('../deployment-log', () => ({
	recordDeployment: vi.fn(),
}))

vi.mock('../vercel-deploy', () => ({
	deployToVercel: vi.fn(async () => ({
		ok: true,
		url: 'https://test.apps.meldar.ai',
		vercelProjectId: 'prj_test',
		vercelDeploymentId: 'dpl_test',
		apiLatencyMs: 100,
		buildDurationMs: 5000,
	})),
}))

vi.mock('@meldar/orchestrator', () => ({
	isValidSlug: vi.fn(() => true),
}))

describe('reserveAllCeilings increment-without-rollback', () => {
	const ORIGINAL_ENV = { ...process.env }

	beforeEach(() => {
		process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
		process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
		process.env.DEPLOY_USER_HOURLY_CAP = '3'
		process.env.DEPLOY_USER_DAILY_CAP = '10'
		process.env.DEPLOY_GLOBAL_DAILY_CAP = '200'
		mockStore.clear()
		vi.clearAllMocks()
	})

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV }
	})

	it('does not waste a rate-limit slot when hourly cap is already at limit', async () => {
		const { guardedDeployCall } = await import('../guarded-deploy-call')

		const now = new Date()
		const y = now.getUTCFullYear()
		const m = String(now.getUTCMonth() + 1).padStart(2, '0')
		const d = String(now.getUTCDate()).padStart(2, '0')
		const h = String(now.getUTCHours()).padStart(2, '0')
		const hourlyKey = `meldar:deploy:u:user_test:h:${y}-${m}-${d}-${h}`

		mockStore.set(hourlyKey, 3)

		const result = await guardedDeployCall({
			userId: 'user_test',
			projectId: 'proj_test',
			slug: 'test-slug',
			files: [{ path: 'package.json', content: '{}' }],
		})

		expect(result.ok).toBe(false)
		if (!result.ok && 'reason' in result) {
			expect(result.reason).toBe('user_hourly_cap')
		}

		expect(mockStore.get(hourlyKey)).toBe(3)
	})

	it('does not waste a rate-limit slot when daily cap is already at limit', async () => {
		const { guardedDeployCall } = await import('../guarded-deploy-call')

		const now = new Date()
		const y = now.getUTCFullYear()
		const m = String(now.getUTCMonth() + 1).padStart(2, '0')
		const d = String(now.getUTCDate()).padStart(2, '0')
		const dailyKey = `meldar:deploy:u:user_test:d:${y}-${m}-${d}`

		mockStore.set(dailyKey, 10)

		const result = await guardedDeployCall({
			userId: 'user_test',
			projectId: 'proj_test',
			slug: 'test-slug',
			files: [{ path: 'package.json', content: '{}' }],
		})

		expect(result.ok).toBe(false)
		if (!result.ok && 'reason' in result) {
			expect(result.reason).toBe('user_daily_cap')
		}

		expect(mockStore.get(dailyKey)).toBe(10)
	})
})
