import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDbExecute } = vi.hoisted(() => ({
	mockDbExecute: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		execute: mockDbExecute,
	}),
}))

import { GET } from '../route'

const CRON_SECRET = 'test-cron-secret-value'

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/cron/cleanup-e2e-users', {
		method: 'GET',
		headers,
	})
}

describe('GET /api/cron/cleanup-e2e-users', () => {
	beforeEach(() => {
		vi.stubEnv('CRON_SECRET', CRON_SECRET)
		mockDbExecute.mockResolvedValue({ rowCount: 0 })
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
			expect(mockDbExecute).not.toHaveBeenCalled()
		})

		it('returns 401 for "Bearer wrong-secret"', async () => {
			const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }))
			expect(res.status).toBe(401)
			expect(mockDbExecute).not.toHaveBeenCalled()
		})

		it('returns 401 for "Basic <CRON_SECRET>" (wrong scheme)', async () => {
			const res = await GET(makeRequest({ authorization: `Basic ${CRON_SECRET}` }))
			expect(res.status).toBe(401)
			expect(mockDbExecute).not.toHaveBeenCalled()
		})

		it('proceeds when Authorization is "Bearer <CRON_SECRET>"', async () => {
			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
			expect(res.status).toBe(200)
		})

		it('does not expose CRON_SECRET in response body', async () => {
			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
			const text = await res.clone().text()
			expect(text).not.toContain(CRON_SECRET)
		})
	})

	describe('happy path', () => {
		it('executes a single DELETE against users with the meldar-test.local email pattern', async () => {
			mockDbExecute.mockResolvedValueOnce({ rowCount: 4 })

			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			expect(res.status).toBe(200)
			expect(mockDbExecute).toHaveBeenCalledOnce()

			const firstArg = mockDbExecute.mock.calls[0]?.[0] as {
				queryChunks?: Array<{ value?: string[] }>
			}
			const chunks = firstArg?.queryChunks ?? []
			const rendered = chunks.map((c) => (c?.value ? c.value.join('') : '')).join('')

			expect(rendered).toMatch(/DELETE\s+FROM\s+users/i)
			expect(rendered).toMatch(/email\s+LIKE\s+'%@meldar-test\.local'/)
		})

		it('respects the 24h freshness window via INTERVAL', async () => {
			await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			const firstArg = mockDbExecute.mock.calls[0]?.[0] as {
				queryChunks?: Array<{ value?: string[] }>
			}
			const rendered = (firstArg?.queryChunks ?? [])
				.map((c) => (c?.value ? c.value.join('') : ''))
				.join('')

			expect(rendered).toMatch(/created_at\s*<\s*NOW\(\)\s*-\s*INTERVAL\s+'24 hours'/i)
		})

		it('relies on FK ON DELETE CASCADE — does not issue a separate DELETE against projects', async () => {
			await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

			expect(mockDbExecute).toHaveBeenCalledOnce()
			const firstArg = mockDbExecute.mock.calls[0]?.[0] as {
				queryChunks?: Array<{ value?: string[] }>
			}
			const rendered = (firstArg?.queryChunks ?? [])
				.map((c) => (c?.value ? c.value.join('') : ''))
				.join('')

			expect(rendered).not.toMatch(/DELETE\s+FROM\s+projects/i)
		})

		it('returns { deleted: N } where N comes from rowCount', async () => {
			mockDbExecute.mockResolvedValueOnce({ rowCount: 7 })

			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
			const json = await res.json()

			expect(json).toEqual({ deleted: 7 })
		})

		it('returns { deleted: 0 } when rowCount is null', async () => {
			mockDbExecute.mockResolvedValueOnce({ rowCount: null })

			const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
			const json = await res.json()

			expect(json).toEqual({ deleted: 0 })
		})

		it('emits a structured log line with deleted count and durationMs', async () => {
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
			try {
				mockDbExecute.mockResolvedValueOnce({ rowCount: 2 })
				await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

				expect(logSpy).toHaveBeenCalledOnce()
				const line = logSpy.mock.calls[0]?.[0] as string
				const parsed = JSON.parse(line) as Record<string, unknown>
				expect(parsed.event).toBe('cron.cleanup_e2e_users')
				expect(parsed.deleted).toBe(2)
				expect(typeof parsed.durationMs).toBe('number')
			} finally {
				logSpy.mockRestore()
			}
		})
	})

	describe('error path', () => {
		it('returns 500 with structured error body when the DELETE throws', async () => {
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			try {
				mockDbExecute.mockRejectedValueOnce(new Error('connection terminated'))
				const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))

				expect(res.status).toBe(500)
				const body = (await res.json()) as { error: string; message: string }
				expect(body.error).toBe('cleanup_failed')
				expect(body.message).toContain('connection terminated')
				expect(errSpy).toHaveBeenCalled()
			} finally {
				errSpy.mockRestore()
			}
		})
	})
})
