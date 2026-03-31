import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/server/billing/stripe'
import { checkoutLimit, checkRateLimit } from '@/server/lib/rate-limit'
import { SITE_CONFIG } from '@/shared/config/seo'
import { PRODUCT_META, STRIPE_PRICES } from '@/shared/config/stripe'

const checkoutSchema = z.object({
	product: z.enum(['timeAudit', 'appBuild', 'starter'] as const),
	email: z.string().email().optional(),
	xrayId: z.string().optional(),
})

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(checkoutLimit, ip)
		if (!success) {
			return NextResponse.json(
				{
					error: {
						code: 'RATE_LIMITED',
						message: 'Too many requests. Try again in a few minutes.',
					},
				},
				{ status: 429 },
			)
		}

		const body = await request.json()
		const parsed = checkoutSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Invalid product or email' } },
				{ status: 400 },
			)
		}

		const { product, email, xrayId } = parsed.data
		const priceId = STRIPE_PRICES[product]
		const meta = PRODUCT_META[product]

		const isSubscription = meta.mode === 'subscription'

		const session = await getStripe().checkout.sessions.create({
			mode: meta.mode,
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${SITE_CONFIG.url}/thank-you?product=${product}`,
			cancel_url: `${SITE_CONFIG.url}`,
			customer_email: email || undefined,
			metadata: {
				product,
				xrayId: xrayId || '',
			},
			allow_promotion_codes: true,
			...(isSubscription && {
				subscription_data: {
					trial_period_days: 7,
					trial_settings: {
						end_behavior: {
							missing_payment_method: 'cancel' as const,
						},
					},
				},
			}),
		})

		return NextResponse.json({ url: session.url })
	} catch {
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Could not create checkout session' } },
			{ status: 500 },
		)
	}
}
