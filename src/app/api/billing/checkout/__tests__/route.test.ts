import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockCheckoutSessionsCreate, mockCheckRateLimit } = vi.hoisted(() => ({
	mockCheckoutSessionsCreate: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
}))

vi.mock('@/server/billing/stripe', () => ({
	getStripe: vi.fn().mockReturnValue({
		checkout: { sessions: { create: mockCheckoutSessionsCreate } },
	}),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	screentimeLimit: null,
	quizLimit: null,
	analyzeLimit: null,
	adaptiveLimit: null,
	checkoutLimit: null,
	loginLimit: null,
	resetLimit: null,
	subscribeLimit: null,
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../checkout/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return new Request('http://localhost/api/billing/checkout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}) as unknown as NextRequest
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/billing/checkout', () => {
	beforeEach(() => {
		mockCheckRateLimit.mockResolvedValue({ success: true })
		mockCheckoutSessionsCreate.mockResolvedValue({
			url: 'https://checkout.stripe.com/c/pay/test123',
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('rate limiting', () => {
		it('returns 429 with RATE_LIMITED code when checkRateLimit returns { success: false }', async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false })

			const res = await POST(makeRequest({ product: 'timeAudit' }))
			const json = await res.json()

			expect(res.status).toBe(429)
			expect(json.error.code).toBe('RATE_LIMITED')
		})
	})

	describe('input validation', () => {
		it('returns 400 VALIDATION_ERROR for an invalid product value (e.g. "free")', async () => {
			const res = await POST(makeRequest({ product: 'free' }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR for an invalid email format', async () => {
			const res = await POST(makeRequest({ product: 'timeAudit', email: 'not-email' }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('accepts request with no email (email is optional)', async () => {
			const res = await POST(makeRequest({ product: 'timeAudit' }))
			expect(res.status).toBe(200)
		})

		it('accepts request with no xrayId (xrayId is optional)', async () => {
			const res = await POST(makeRequest({ product: 'timeAudit', email: 'test@example.com' }))
			expect(res.status).toBe(200)
		})
	})

	describe('Stripe session creation', () => {
		it('creates a payment-mode session for product "timeAudit" (mode: "payment", no subscription_data)', async () => {
			await POST(makeRequest({ product: 'timeAudit' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'payment',
				}),
			)
			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.not.objectContaining({
					subscription_data: expect.anything(),
				}),
			)
		})

		it('creates a payment-mode session for product "appBuild" (mode: "payment", no subscription_data)', async () => {
			await POST(makeRequest({ product: 'appBuild' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'payment',
				}),
			)
		})

		it('creates a subscription-mode session for product "starter" (mode: "subscription")', async () => {
			await POST(makeRequest({ product: 'starter' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'subscription',
				}),
			)
		})

		it('does NOT include subscription_data in Stripe call for timeAudit (payment mode)', async () => {
			await POST(makeRequest({ product: 'timeAudit' }))

			const call = mockCheckoutSessionsCreate.mock.calls[0][0]
			expect(call.subscription_data).toBeUndefined()
		})

		it('does NOT include subscription_data in Stripe call for appBuild (payment mode)', async () => {
			await POST(makeRequest({ product: 'appBuild' }))

			const call = mockCheckoutSessionsCreate.mock.calls[0][0]
			expect(call.subscription_data).toBeUndefined()
		})

		it('DOES include subscription_data.trial_period_days: 7 in Stripe call for starter (subscription mode)', async () => {
			await POST(makeRequest({ product: 'starter' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					subscription_data: expect.objectContaining({
						trial_period_days: 7,
					}),
				}),
			)
		})

		it('passes customer_email to Stripe when email is provided in request', async () => {
			await POST(makeRequest({ product: 'timeAudit', email: 'buyer@example.com' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					customer_email: 'buyer@example.com',
				}),
			)
		})

		it('passes customer_email as undefined to Stripe when email is absent', async () => {
			await POST(makeRequest({ product: 'timeAudit' }))

			const call = mockCheckoutSessionsCreate.mock.calls[0][0]
			expect(call.customer_email).toBeUndefined()
		})

		it('passes xrayId in session metadata when xrayId is provided', async () => {
			await POST(makeRequest({ product: 'timeAudit', xrayId: 'xray-abc' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						xrayId: 'xray-abc',
					}),
				}),
			)
		})

		it('passes empty string for xrayId in metadata when xrayId is absent', async () => {
			await POST(makeRequest({ product: 'timeAudit' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						xrayId: '',
					}),
				}),
			)
		})

		it('passes allow_promotion_codes: true in all Stripe calls', async () => {
			await POST(makeRequest({ product: 'timeAudit' }))

			expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					allow_promotion_codes: true,
				}),
			)
		})
	})

	describe('response', () => {
		it('returns { url: session.url } on success', async () => {
			const res = await POST(makeRequest({ product: 'timeAudit' }))
			const json = await res.json()

			expect(json.url).toBe('https://checkout.stripe.com/c/pay/test123')
		})

		it('returns HTTP 200 on success', async () => {
			const res = await POST(makeRequest({ product: 'timeAudit' }))
			expect(res.status).toBe(200)
		})
	})

	describe('errors', () => {
		it('returns 500 INTERNAL_ERROR when getStripe().checkout.sessions.create throws', async () => {
			mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'))

			const res = await POST(makeRequest({ product: 'timeAudit' }))
			const json = await res.json()

			expect(res.status).toBe(500)
			expect(json.error.code).toBe('INTERNAL_ERROR')
		})
	})
})
