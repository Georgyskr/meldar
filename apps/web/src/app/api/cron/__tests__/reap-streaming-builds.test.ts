import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDbExecute } = vi.hoisted(() => ({
	mockDbExecute: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		execute: mockDbExecute,
	}),
}))

import { GET } from '../reap-streaming-builds/route'

const CRON_SECRET = 'test-cron-secret-value'

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/cron/reap-streaming-builds', {
		method: 'GET',
		headers,
	})
}

describe('F7: reap-streaming-builds cron', () => {
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
	})

	it('returns 401 for wrong bearer token', async () => {
		const res = await GET(makeRequest({ authorization: 'Bearer wrong' }))
		expect(res.status).toBe(401)
	})

	it('executes UPDATE targeting streaming builds older than 30 minutes', async () => {
		mockDbExecute.mockResolvedValueOnce({ rowCount: 3 })
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ reaped: 3 })

		expect(mockDbExecute).toHaveBeenCalledOnce()
		// Inspect the SQL string Drizzle built from the tagged template
		const firstArg = mockDbExecute.mock.calls[0]?.[0] as {
			queryChunks?: Array<{ value?: string[] }>
		}
		const chunks = firstArg?.queryChunks ?? []
		const rendered = chunks.map((c) => (c?.value ? c.value.join('') : '')).join('')
		expect(rendered).toMatch(/UPDATE\s+builds/i)
		expect(rendered).toMatch(/status\s*=\s*'failed'/)
		expect(rendered).toMatch(/status\s*=\s*'streaming'/)
		expect(rendered).toMatch(/INTERVAL\s+'30 minutes'/)
	})

	it('returns 500 with structured error body when the UPDATE throws', async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			mockDbExecute.mockRejectedValueOnce(new Error('connection terminated'))
			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			expect(res.status).toBe(500)
			const body = (await res.json()) as { error: string; message: string }
			expect(body.error).toBe('reaper_failed')
			expect(body.message).toContain('connection terminated')
			expect(errSpy).toHaveBeenCalled()
		} finally {
			errSpy.mockRestore()
		}
	})

	it('emits a structured log line with reapedCount and durationMs on success', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		try {
			mockDbExecute.mockResolvedValueOnce({ rowCount: 7 })
			await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			expect(logSpy).toHaveBeenCalledOnce()
			const line = logSpy.mock.calls[0]?.[0] as string
			const parsed = JSON.parse(line) as Record<string, unknown>
			expect(parsed.event).toBe('cron.reap_streaming_builds')
			expect(parsed.reapedCount).toBe(7)
			expect(typeof parsed.durationMs).toBe('number')
		} finally {
			logSpy.mockRestore()
		}
	})
})
