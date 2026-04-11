import type { AgentTaskStatus } from '@meldar/db/schema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const FAKE_TASK_ID = '00000000-0000-4000-8000-000000000001'
const FAKE_PROJECT_ID = '00000000-0000-4000-8000-000000000002'
const FAKE_RESEND_ID = 'resend-abc-123'
const WEBHOOK_SECRET = 'whsec_test_secret'

function makeTask(
	overrides: Partial<{ id: string; status: AgentTaskStatus; result: unknown }> = {},
) {
	return {
		id: FAKE_TASK_ID,
		projectId: FAKE_PROJECT_ID,
		agentType: 'booking_confirmation' as const,
		status: 'verifying' as AgentTaskStatus,
		payload: { recipientEmail: 'test@example.com' },
		result: { resendId: FAKE_RESEND_ID },
		autoApproved: false,
		proposedAt: new Date('2026-04-10T10:00:00Z'),
		approvedAt: new Date('2026-04-10T10:01:00Z'),
		executedAt: new Date('2026-04-10T10:02:00Z'),
		verifiedAt: null,
		...overrides,
	}
}

function makeWebhookPayload(type: string, emailId: string = FAKE_RESEND_ID) {
	return {
		type,
		data: {
			email_id: emailId,
			to: ['test@example.com'],
			from: 'hello@meldar.ai',
			subject: 'Booking confirmed',
		},
	}
}

const { mockSvixVerify, mockFindTaskByResendId, mockCompleteTask, mockFailTask, mockEscalateTask } =
	vi.hoisted(() => ({
		mockSvixVerify: vi.fn(),
		mockFindTaskByResendId: vi.fn(),
		mockCompleteTask: vi.fn(),
		mockFailTask: vi.fn(),
		mockEscalateTask: vi.fn(),
	}))

vi.mock('svix', () => ({
	Webhook: class MockWebhook {
		verify = mockSvixVerify
	},
}))

vi.mock('@/server/agents/agent-task-service', () => ({
	findTaskByResendId: mockFindTaskByResendId,
	completeTask: mockCompleteTask,
	failTask: mockFailTask,
	escalateTask: mockEscalateTask,
}))

import { POST } from '../route'

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/webhooks/resend', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'svix-id': 'msg_test123',
			'svix-timestamp': '1234567890',
			'svix-signature': 'v1,valid_sig',
			...headers,
		},
		body: JSON.stringify(body),
	})
}

describe('POST /api/webhooks/resend', () => {
	beforeEach(() => {
		vi.stubEnv('RESEND_WEBHOOK_SECRET', WEBHOOK_SECRET)
		mockSvixVerify.mockImplementation((body: string) => JSON.parse(body))
		mockFindTaskByResendId.mockResolvedValue(null)
		mockCompleteTask.mockResolvedValue(makeTask({ status: 'done' }))
		mockFailTask.mockResolvedValue(makeTask({ status: 'failed' }))
		mockEscalateTask.mockResolvedValue(makeTask({ status: 'escalated' }))
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	describe('signature verification', () => {
		it('returns 401 when RESEND_WEBHOOK_SECRET is not set', async () => {
			vi.stubEnv('RESEND_WEBHOOK_SECRET', '')

			const res = await POST(makeRequest(makeWebhookPayload('email.delivered')))
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})

		it('returns 401 when svix headers are missing', async () => {
			const req = new Request('http://localhost/api/webhooks/resend', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(makeWebhookPayload('email.delivered')),
			})

			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})

		it('returns 401 when svix verification fails', async () => {
			mockSvixVerify.mockImplementation(() => {
				throw new Error('Invalid signature')
			})

			const res = await POST(makeRequest(makeWebhookPayload('email.delivered')))
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})
	})

	describe('payload validation', () => {
		it('returns 400 when payload has no type', async () => {
			const res = await POST(makeRequest({ data: { email_id: 'x' } }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('BAD_REQUEST')
		})

		it('returns 400 when payload has no email_id', async () => {
			const res = await POST(makeRequest({ type: 'email.delivered', data: {} }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('BAD_REQUEST')
		})
	})

	describe('email.delivered', () => {
		it('transitions verifying task to done', async () => {
			const task = makeTask({ status: 'verifying' })
			mockFindTaskByResendId.mockResolvedValue(task)

			const res = await POST(makeRequest(makeWebhookPayload('email.delivered')))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.received).toBe(true)
			expect(json.matched).toBe(true)
			expect(mockCompleteTask).toHaveBeenCalledWith(FAKE_TASK_ID, {
				resendId: FAKE_RESEND_ID,
				deliveryEvent: 'delivered',
			})
		})

		it('does not transition when task is not in verifying status', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'done' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.delivered')))

			expect(res.status).toBe(200)
			expect(mockCompleteTask).not.toHaveBeenCalled()
		})

		it('returns matched: false when no task found for resend ID', async () => {
			mockFindTaskByResendId.mockResolvedValue(null)

			const res = await POST(makeRequest(makeWebhookPayload('email.delivered')))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.matched).toBe(false)
			expect(mockCompleteTask).not.toHaveBeenCalled()
		})
	})

	describe('email.bounced', () => {
		it('transitions verifying task to failed', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'verifying' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.bounced')))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.received).toBe(true)
			expect(mockFailTask).toHaveBeenCalledWith(FAKE_TASK_ID, `email.bounced: ${FAKE_RESEND_ID}`)
		})

		it('transitions already-failed task to escalated', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'failed' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.bounced')))

			expect(res.status).toBe(200)
			expect(mockEscalateTask).toHaveBeenCalledWith(
				FAKE_TASK_ID,
				`email.bounced after failure: ${FAKE_RESEND_ID}`,
			)
		})
	})

	describe('email.complained', () => {
		it('transitions verifying task to failed', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'verifying' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.complained')))

			expect(res.status).toBe(200)
			expect(mockFailTask).toHaveBeenCalledWith(FAKE_TASK_ID, `email.complained: ${FAKE_RESEND_ID}`)
		})

		it('transitions already-failed task to escalated', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'failed' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.complained')))

			expect(res.status).toBe(200)
			expect(mockEscalateTask).toHaveBeenCalledWith(
				FAKE_TASK_ID,
				`email.complained after failure: ${FAKE_RESEND_ID}`,
			)
		})
	})

	describe('idempotency', () => {
		it('processing same delivered event twice does not crash', async () => {
			const task = makeTask({ status: 'verifying' })
			mockFindTaskByResendId.mockResolvedValue(task)

			const payload = makeWebhookPayload('email.delivered')
			const res1 = await POST(makeRequest(payload))
			expect(res1.status).toBe(200)

			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'done' }))
			const res2 = await POST(makeRequest(payload))
			expect(res2.status).toBe(200)

			expect(mockCompleteTask).toHaveBeenCalledTimes(1)
		})

		it('processing same bounced event twice does not crash', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'verifying' }))

			const payload = makeWebhookPayload('email.bounced')
			const res1 = await POST(makeRequest(payload))
			expect(res1.status).toBe(200)

			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'failed' }))
			const res2 = await POST(makeRequest(payload))
			expect(res2.status).toBe(200)

			expect(mockFailTask).toHaveBeenCalledTimes(1)
			expect(mockEscalateTask).toHaveBeenCalledTimes(1)
		})
	})

	describe('unhandled event types', () => {
		it('returns 200 for unknown event types without side effects', async () => {
			mockFindTaskByResendId.mockResolvedValue(makeTask({ status: 'verifying' }))

			const res = await POST(makeRequest(makeWebhookPayload('email.opened')))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.received).toBe(true)
			expect(mockCompleteTask).not.toHaveBeenCalled()
			expect(mockFailTask).not.toHaveBeenCalled()
			expect(mockEscalateTask).not.toHaveBeenCalled()
		})
	})
})
