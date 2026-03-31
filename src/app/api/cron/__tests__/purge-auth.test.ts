import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDbExecute } = vi.hoisted(() => ({
	mockDbExecute: vi.fn(),
}))

vi.mock('@/server/db/client', () => ({
	getDb: () => ({
		execute: mockDbExecute,
	}),
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { GET } from '../purge/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/cron/purge', {
		method: 'GET',
		headers,
	})
}

const CRON_SECRET = 'test-cron-secret-value'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Cron route authorization', () => {
	beforeEach(() => {
		vi.stubEnv('CRON_SECRET', CRON_SECRET)
		mockDbExecute.mockResolvedValue({ rowCount: 0 })
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('returns 401 for missing Authorization header', async () => {
		const res = await GET(makeRequest())

		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 401 for "Bearer wrong-secret"', async () => {
		const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }))

		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 401 for "Basic <CRON_SECRET>" (wrong scheme)', async () => {
		const res = await GET(makeRequest({ authorization: `Basic ${CRON_SECRET}` }))

		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 200 for correct "Bearer <CRON_SECRET>"', async () => {
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.purged).toBeDefined()
	})

	it('does not expose CRON_SECRET value in response body', async () => {
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

		const text = await res.clone().text()
		expect(text).not.toContain(CRON_SECRET)
	})
})
