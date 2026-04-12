import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'


const { mockDbExecute } = vi.hoisted(() => ({
	mockDbExecute: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		execute: mockDbExecute,
	}),
}))

vi.mock('drizzle-orm', () => ({
	sql: (strings: TemplateStringsArray, ..._values: unknown[]) => ({
		_tag: 'sql',
		strings,
	}),
}))


import { GET } from '../../purge/route'


function makeRequest(headers?: Record<string, string>): Request {
	return new Request('http://localhost/api/cron/purge', {
		method: 'GET',
		headers: headers ?? {},
	})
}


describe('GET /api/cron/purge', () => {
	beforeEach(() => {
		vi.stubEnv('CRON_SECRET', 'test-cron-secret')
		mockDbExecute.mockResolvedValue({ rowCount: 5 })
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	describe('authorization', () => {
		it('returns 401 when Authorization header is absent', async () => {
			const res = await GET(makeRequest())
			expect(res.status).toBe(401)
			const json = await res.json()
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 when Authorization header is "Bearer wrong-secret"', async () => {
			const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }))
			expect(res.status).toBe(401)
		})

		it('returns 401 when scheme is "Basic <CRON_SECRET>" (wrong scheme)', async () => {
			const res = await GET(makeRequest({ authorization: 'Basic test-cron-secret' }))
			expect(res.status).toBe(401)
		})

		it('proceeds when Authorization is "Bearer <CRON_SECRET>"', async () => {
			const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
			expect(res.status).toBe(200)
		})
	})

	describe('happy path', () => {
		it('executes DELETE SQL for discovery_sessions older than 30 days where tier_purchased IS NULL', async () => {
			await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
			expect(mockDbExecute).toHaveBeenCalledTimes(2)
		})

		it('executes DELETE SQL for xray_results older than 30 days without linked audit_orders', async () => {
			await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
			expect(mockDbExecute).toHaveBeenCalledTimes(2)
		})

		it('returns { purged: { sessions: N, xrays: M } } with rowCount values from db.execute results', async () => {
			mockDbExecute.mockResolvedValueOnce({ rowCount: 10 }).mockResolvedValueOnce({ rowCount: 3 })

			const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
			const json = await res.json()

			expect(json.purged.sessions).toBe(10)
			expect(json.purged.xrays).toBe(3)
		})

		it('returns { sessions: 0, xrays: 0 } when db.execute returns rowCount: null', async () => {
			mockDbExecute
				.mockResolvedValueOnce({ rowCount: null })
				.mockResolvedValueOnce({ rowCount: null })

			const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
			const json = await res.json()

			expect(json.purged.sessions).toBe(0)
			expect(json.purged.xrays).toBe(0)
		})
	})
})
