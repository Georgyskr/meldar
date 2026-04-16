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

	it('executes pipeline_runs reap + builds reap + retention purge', async () => {
		mockDbExecute
			.mockResolvedValueOnce({ rowCount: 2 })
			.mockResolvedValueOnce({ rowCount: 3 })
			.mockResolvedValueOnce({ rowCount: 11 })
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ pipelinesReaped: 2, buildsReaped: 3, runsPurged: 11 })

		expect(mockDbExecute).toHaveBeenCalledTimes(3)
		const renderChunks = (arg: unknown): string => {
			const chunks = (arg as { queryChunks?: Array<{ value?: string[] }> }).queryChunks ?? []
			return chunks.map((c) => (c?.value ? c.value.join('') : '')).join('')
		}
		const firstSql = renderChunks(mockDbExecute.mock.calls[0]?.[0])
		const secondSql = renderChunks(mockDbExecute.mock.calls[1]?.[0])
		const thirdSql = renderChunks(mockDbExecute.mock.calls[2]?.[0])
		expect(firstSql).toMatch(/UPDATE\s+pipeline_runs/i)
		expect(firstSql).toMatch(/INTERVAL\s+'10 minutes'/)
		expect(secondSql).toMatch(/UPDATE\s+builds/i)
		expect(secondSql).toMatch(/INTERVAL\s+'30 minutes'/)
		expect(thirdSql).toMatch(/DELETE FROM pipeline_runs/i)
		expect(thirdSql).toMatch(/INTERVAL\s+'30 days'/)
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

	it('emits a structured log line with pipelinesReaped/buildsReaped/runsPurged and durationMs', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		try {
			mockDbExecute
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce({ rowCount: 7 })
				.mockResolvedValueOnce({ rowCount: 4 })
			await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			expect(logSpy).toHaveBeenCalledOnce()
			const line = logSpy.mock.calls[0]?.[0] as string
			const parsed = JSON.parse(line) as Record<string, unknown>
			expect(parsed.event).toBe('cron.reap_streaming_builds')
			expect(parsed.pipelinesReaped).toBe(1)
			expect(parsed.buildsReaped).toBe(7)
			expect(parsed.runsPurged).toBe(4)
			expect(typeof parsed.durationMs).toBe('number')
		} finally {
			logSpy.mockRestore()
		}
	})
})
