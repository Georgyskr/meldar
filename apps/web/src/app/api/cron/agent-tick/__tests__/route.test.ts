import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUpdate, mockResendSend, mockCheckSpend, mockRecordSpend } = vi.hoisted(() => ({
	mockUpdate: vi.fn(),
	mockResendSend: vi.fn(),
	mockCheckSpend: vi.fn(),
	mockRecordSpend: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		update: mockUpdate,
	}),
}))

vi.mock('resend', () => {
	class MockResend {
		emails = { send: mockResendSend }
	}
	return { Resend: MockResend }
})

vi.mock('@/server/lib/spend-ceiling', () => ({
	checkGlobalSpendCeiling: mockCheckSpend,
	recordGlobalSpend: mockRecordSpend,
}))

import { GET } from '../route'

const CRON_SECRET = 'test-cron-secret'

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/cron/agent-tick', {
		method: 'GET',
		headers,
	})
}

function authedRequest(): Request {
	return makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
}

function makeTaskRow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'task-001',
		agentType: 'booking_confirmation',
		payload: {
			recipientEmail: 'customer@example.com',
			businessName: 'Test Salon',
			bookingDetails: {
				date: '2026-04-15',
				time: '14:00',
				service: 'Haircut',
			},
		},
		...overrides,
	}
}

function setupClaimMock(rows: unknown[]) {
	let callCount = 0
	mockUpdate.mockImplementation(() => {
		callCount++
		if (callCount === 1) {
			const returningFn = vi.fn().mockResolvedValue(rows)
			const whereFn = vi.fn().mockReturnValue({ returning: returningFn })
			const setFn = vi.fn().mockReturnValue({ where: whereFn })
			return { set: setFn }
		}
		const whereFn = vi.fn().mockResolvedValue(undefined)
		const setFn = vi.fn().mockReturnValue({ where: whereFn })
		return { set: setFn }
	})
}

describe('GET /api/cron/agent-tick', () => {
	beforeEach(() => {
		vi.stubEnv('CRON_SECRET', CRON_SECRET)
		vi.stubEnv('RESEND_API_KEY', 're_test_fake')
		mockCheckSpend.mockResolvedValue({ allowed: true, spentToday: 0, ceiling: 3000 })
		mockRecordSpend.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	describe('authorization', () => {
		it('returns 401 for missing Authorization header', async () => {
			const res = await GET(makeRequest())
			expect(res.status).toBe(401)
			const json = await res.json()
			expect(json.error).toBe('Unauthorized')
		})

		it('returns 401 for wrong secret', async () => {
			const res = await GET(makeRequest({ authorization: 'Bearer wrong' }))
			expect(res.status).toBe(401)
		})

		it('returns 401 for wrong scheme', async () => {
			const res = await GET(makeRequest({ authorization: `Basic ${CRON_SECRET}` }))
			expect(res.status).toBe(401)
		})
	})

	describe('empty queue', () => {
		it('returns processed: 0 when no approved tasks exist', async () => {
			setupClaimMock([])
			const res = await GET(authedRequest())
			expect(res.status).toBe(200)
			const json = await res.json()
			expect(json.processed).toBe(0)
			expect(json.results).toEqual([])
		})
	})

	describe('spend cap', () => {
		it('skips when global spend ceiling is exceeded', async () => {
			mockCheckSpend.mockResolvedValue({
				allowed: false,
				reason: 'ceiling_exceeded',
				spentToday: 3000,
				ceiling: 3000,
			})
			const res = await GET(authedRequest())
			expect(res.status).toBe(200)
			const json = await res.json()
			expect(json.skipped).toBe('spend_ceiling')
		})

		it('records spend for each processed task', async () => {
			const tasks = Array.from({ length: 3 }, (_, i) =>
				makeTaskRow({ id: `task-${String(i).padStart(3, '0')}` }),
			)
			setupClaimMock(tasks)
			mockResendSend.mockResolvedValue({ data: { id: 'resend-id' }, error: null })

			await GET(authedRequest())

			expect(mockRecordSpend).toHaveBeenCalledTimes(3)
			for (const call of mockRecordSpend.mock.calls) {
				expect(call[0]).toBe(1)
			}
		})
	})

	describe('task processing', () => {
		it('processes a booking_confirmation task successfully', async () => {
			setupClaimMock([makeTaskRow()])
			mockResendSend.mockResolvedValue({ data: { id: 'resend-123' }, error: null })

			const res = await GET(authedRequest())
			expect(res.status).toBe(200)
			const json = await res.json()

			expect(json.processed).toBe(1)
			expect(json.results[0].status).toBe('verifying')
			expect(json.results[0].taskId).toBe('task-001')
			expect(mockRecordSpend).toHaveBeenCalledWith(1)
		})

		it('transitions task to failed when Resend returns an error', async () => {
			setupClaimMock([makeTaskRow()])
			mockResendSend.mockResolvedValue({
				data: null,
				error: { message: 'Invalid recipient' },
			})

			const res = await GET(authedRequest())
			const json = await res.json()

			expect(json.results[0].status).toBe('failed')
			expect(json.results[0].error).toBe('Invalid recipient')
		})

		it('handles executor throwing without crashing the route', async () => {
			setupClaimMock([makeTaskRow()])
			mockResendSend.mockRejectedValue(new Error('Network timeout'))

			const res = await GET(authedRequest())
			expect(res.status).toBe(200)
			const json = await res.json()

			expect(json.results[0].status).toBe('failed')
			expect(json.results[0].error).toBe('Network timeout')
		})

		it('marks unknown agent types as failed', async () => {
			setupClaimMock([makeTaskRow({ agentType: 'unknown_type' })])

			const res = await GET(authedRequest())
			const json = await res.json()

			expect(json.results[0].status).toBe('failed')
			expect(json.results[0].error).toContain('Unknown agent type')
		})
	})

	describe('status transitions', () => {
		it('claims tasks via UPDATE...RETURNING', async () => {
			setupClaimMock([makeTaskRow()])
			mockResendSend.mockResolvedValue({ data: { id: 'resend-123' }, error: null })

			await GET(authedRequest())

			expect(mockUpdate).toHaveBeenCalled()
		})
	})
})
