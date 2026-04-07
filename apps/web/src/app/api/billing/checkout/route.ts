import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/server/billing/stripe'
import { checkoutLimit, checkRateLimit } from '@/server/lib/rate-limit'
import { SITE_CONFIG } from '@/shared/config/seo'
import { getStripePriceId, PRODUCT_META, resolveProductSlug } from '@/shared/config/stripe'

/**
 * Accepts canonical v3 slugs AND legacy aliases (e.g. `appBuild` → `vipBuild`).
 * The resolver in `shared/config/stripe.ts` is the single source of truth for
 * what's accepted; this enum keeps Zod validation tight on the way in but is
 * intentionally permissive of legacy slugs so existing UI doesn't break
 * mid-deploy.
 */
const checkoutSchema = z.object({
	product: z.enum(['timeAudit', 'vipBuild', 'builder', 'appBuild'] as const),
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

		const { product: incomingProduct, email, xrayId } = parsed.data

		const slug = resolveProductSlug(incomingProduct)
		if (!slug) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Unknown product' } },
				{ status: 400 },
			)
		}

		const priceId = getStripePriceId(slug)
		const meta = PRODUCT_META[slug]
		const isSubscription = meta.mode === 'subscription'

		const session = await getStripe().checkout.sessions.create({
			mode: meta.mode,
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${SITE_CONFIG.url}/thank-you?product=${slug}`,
			cancel_url: `${SITE_CONFIG.url}`,
			customer_email: email || undefined,
			metadata: {
				product: slug,
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
