import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
	mockWebhooksConstructEvent,
	mockDbInsert,
	mockDbValues,
	mockDbOnConflictDoNothing,
	mockResendEmailsSend,
} = vi.hoisted(() => ({
	mockWebhooksConstructEvent: vi.fn(),
	mockDbInsert: vi.fn(),
	mockDbValues: vi.fn(),
	mockDbOnConflictDoNothing: vi.fn(),
	mockResendEmailsSend: vi.fn().mockResolvedValue({ id: 'email-123' }),
}))

vi.mock('@/server/billing/stripe', () => ({
	getStripe: vi.fn().mockReturnValue({
		webhooks: { constructEvent: mockWebhooksConstructEvent },
	}),
}))

vi.mock('@/server/db/client', () => ({
	getDb: () => ({
		insert: mockDbInsert,
	}),
}))

vi.mock('@/server/db/schema', () => ({
	auditOrders: Symbol('auditOrders'),
	subscribers: Symbol('subscribers'),
}))

vi.mock('resend', () => {
	return {
		Resend: class MockResend {
			emails = { send: mockResendEmailsSend }
		},
	}
})

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../webhook/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeWebhookRequest(body: string, sig: string): NextRequest {
	return new Request('http://localhost/api/billing/webhook', {
		method: 'POST',
		headers: { 'stripe-signature': sig },
		body,
	}) as unknown as NextRequest
}

function makeSessionCompletedEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
	return {
		type: 'checkout.session.completed',
		data: {
			object: {
				id: 'cs_test_123',
				customer_email: 'buyer@example.com',
				customer_details: null,
				customer: 'cus_123',
				amount_total: 4900,
				currency: 'eur',
				metadata: { product: 'timeAudit', xrayId: '' },
				...overrides,
			} as Stripe.Checkout.Session,
		},
	} as Stripe.Event
}

function makeSubscriptionEvent(
	type: 'customer.subscription.created' | 'customer.subscription.deleted',
): Stripe.Event {
	return {
		type,
		data: {
			object: {
				customer: 'cus_456',
				status: 'active',
				trial_end: null,
			} as unknown as Stripe.Subscription,
		},
	} as Stripe.Event
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
	beforeEach(() => {
		vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test123')
		vi.stubEnv('RESEND_API_KEY', 're_test_key')
		mockDbInsert.mockReturnValue({ values: mockDbValues })
		mockDbValues.mockReturnValue({ onConflictDoNothing: mockDbOnConflictDoNothing })
		mockDbOnConflictDoNothing.mockResolvedValue(undefined)
		mockWebhooksConstructEvent.mockReturnValue(makeSessionCompletedEvent())
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	describe('authorization checks (before constructEvent)', () => {
		it('returns 401 when stripe-signature header is absent', async () => {
			const req = new Request('http://localhost/api/billing/webhook', {
				method: 'POST',
				body: 'payload',
			}) as unknown as NextRequest

			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})

		it('returns 401 when STRIPE_WEBHOOK_SECRET env var is not set', async () => {
			vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')

			const res = await POST(makeWebhookRequest('payload', 'sig_test'))
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})
	})

	describe('signature verification', () => {
		it('returns 401 when constructEvent throws (invalid or tampered signature)', async () => {
			mockWebhooksConstructEvent.mockImplementation(() => {
				throw new Error('Invalid signature')
			})

			const res = await POST(makeWebhookRequest('payload', 'bad_sig'))
			const json = await res.json()

			expect(res.status).toBe(401)
			expect(json.error.code).toBe('UNAUTHORIZED')
		})

		it('proceeds when constructEvent returns a valid event', async () => {
			const res = await POST(makeWebhookRequest('payload', 'valid_sig'))
			expect(res.status).toBe(200)
		})
	})

	describe('checkout.session.completed — timeAudit product', () => {
		beforeEach(() => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSessionCompletedEvent({ metadata: { product: 'timeAudit', xrayId: '' } }),
			)
		})

		it('inserts into auditOrders with product: "time_audit"', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			expect(mockDbInsert).toHaveBeenCalled()
			// First insert call should be auditOrders
			const firstInsertValues = mockDbValues.mock.calls[0][0]
			expect(firstInsertValues.product).toBe('time_audit')
		})

		it('sends purchase confirmation email to buyer address', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			const emailCalls = mockResendEmailsSend.mock.calls
			const buyerEmail = emailCalls.find(
				(call: Record<string, string>[]) => call[0].to === 'buyer@example.com',
			)
			expect(buyerEmail).toBeDefined()
		})

		it('sends founder notification email to gosha.skryuchenkov@gmail.com', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			const emailCalls = mockResendEmailsSend.mock.calls
			const founderEmail = emailCalls.find(
				(call: Record<string, string>[]) => call[0].to === 'gosha.skryuchenkov@gmail.com',
			)
			expect(founderEmail).toBeDefined()
		})

		it('inserts buyer into subscribers table with source: "checkout"', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			// The last insert call should be subscribers
			const lastInsertValues = mockDbValues.mock.calls[mockDbValues.mock.calls.length - 1][0]
			expect(lastInsertValues.email).toBe('buyer@example.com')
			expect(lastInsertValues.source).toBe('checkout')
		})

		it('returns { received: true }', async () => {
			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()

			expect(json.received).toBe(true)
		})
	})

	describe('checkout.session.completed — appBuild product', () => {
		beforeEach(() => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSessionCompletedEvent({ metadata: { product: 'appBuild', xrayId: '' } }),
			)
		})

		it('inserts into auditOrders with product: "app_build"', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			const firstInsertValues = mockDbValues.mock.calls[0][0]
			expect(firstInsertValues.product).toBe('app_build')
		})

		it('sends purchase confirmation and founder notification emails', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			// 2 emails: buyer confirmation + founder notification
			expect(mockResendEmailsSend).toHaveBeenCalledTimes(2)
		})

		it('inserts into subscribers table', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			const lastInsertValues = mockDbValues.mock.calls[mockDbValues.mock.calls.length - 1][0]
			expect(lastInsertValues.source).toBe('checkout')
		})
	})

	describe('checkout.session.completed — starter product (subscription, not audit)', () => {
		beforeEach(() => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSessionCompletedEvent({ metadata: { product: 'starter', xrayId: '' } }),
			)
		})

		it('does NOT insert into auditOrders', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			// Only 1 insert call: subscribers (not auditOrders)
			expect(mockDbInsert).toHaveBeenCalledTimes(1)
			const insertValues = mockDbValues.mock.calls[0][0]
			expect(insertValues.source).toBe('checkout')
		})

		it('does NOT call resend.emails.send at all', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))
			expect(mockResendEmailsSend).not.toHaveBeenCalled()
		})

		it('DOES insert buyer into subscribers table', async () => {
			await POST(makeWebhookRequest('payload', 'sig'))

			const insertValues = mockDbValues.mock.calls[0][0]
			expect(insertValues.email).toBe('buyer@example.com')
			expect(insertValues.source).toBe('checkout')
			expect(insertValues.foundingMember).toBe(false)
		})

		it('returns { received: true }', async () => {
			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()
			expect(json.received).toBe(true)
		})
	})

	describe('checkout.session.completed — missing email', () => {
		it('returns { received: true } immediately without any DB insert or email when both customer_email and customer_details.email are null/undefined', async () => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSessionCompletedEvent({
					customer_email: null,
					customer_details: null,
				}),
			)

			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()

			expect(json.received).toBe(true)
			expect(mockDbInsert).not.toHaveBeenCalled()
			expect(mockResendEmailsSend).not.toHaveBeenCalled()
		})
	})

	describe('customer.subscription.created event', () => {
		it('does not throw — logs customerId and status to console, then returns { received: true }', async () => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSubscriptionEvent('customer.subscription.created'),
			)

			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()

			expect(json.received).toBe(true)
		})
	})

	describe('customer.subscription.deleted event', () => {
		it('does not throw — logs customerId and status to console, then returns { received: true }', async () => {
			mockWebhooksConstructEvent.mockReturnValue(
				makeSubscriptionEvent('customer.subscription.deleted'),
			)

			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()

			expect(json.received).toBe(true)
		})
	})

	describe('unhandled event types', () => {
		it('returns { received: true } for an arbitrary event type without error or side effects', async () => {
			mockWebhooksConstructEvent.mockReturnValue({
				type: 'payment_intent.succeeded',
				data: { object: {} },
			})

			const res = await POST(makeWebhookRequest('payload', 'sig'))
			const json = await res.json()

			expect(json.received).toBe(true)
			expect(mockDbInsert).not.toHaveBeenCalled()
			expect(mockResendEmailsSend).not.toHaveBeenCalled()
		})
	})
})
