import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/server/billing/stripe'
import { PRODUCT_META, STRIPE_PRICES } from '@/shared/config/stripe'

const checkoutSchema = z.object({
	product: z.enum(['timeAudit', 'appBuild', 'starter'] as const),
	email: z.string().email().optional(),
	xrayId: z.string().optional(),
})

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const parsed = checkoutSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Invalid product or email' } },
				{ status: 400 },
			)
		}

		const { product, email, xrayId } = parsed.data

		// Starter is coming soon — capture interest, don't charge
		if (product === 'starter') {
			if (email) {
				const { getDb } = await import('@/server/db/client')
				const { subscribers } = await import('@/server/db/schema')
				const db = getDb()
				await db
					.insert(subscribers)
					.values({ email, source: 'starter_interest', foundingMember: false })
					.onConflictDoNothing()
			}
			return NextResponse.json({ comingSoon: true })
		}

		const priceId = STRIPE_PRICES[product]
		const meta = PRODUCT_META[product]

		const session = await getStripe().checkout.sessions.create({
			mode: meta.mode,
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${request.nextUrl.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${request.nextUrl.origin}`,
			customer_email: email || undefined,
			metadata: {
				product,
				xrayId: xrayId || '',
			},
			allow_promotion_codes: true,
		})

		return NextResponse.json({ url: session.url })
	} catch {
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Could not create checkout session' } },
			{ status: 500 },
		)
	}
}
