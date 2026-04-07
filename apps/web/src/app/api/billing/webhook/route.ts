import { getDb } from '@meldar/db/client'
import { auditOrders, subscribers } from '@meldar/db/schema'
import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type Stripe from 'stripe'
import { getStripe } from '@/server/billing/stripe'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Display names for purchase confirmation emails. Includes both canonical v3
 * slugs and legacy aliases so existing webhook events with old metadata still
 * resolve to the right name. New code emits canonical slugs only.
 */
const PRODUCT_NAMES: Record<string, string> = {
	// Canonical v3 slugs
	timeAudit: 'Personal Time Audit',
	vipBuild: 'Skip-the-Line VIP',
	builder: 'Meldar Builder',
	// Legacy slugs (still in historical webhook events / Stripe metadata)
	appBuild: 'Skip-the-Line VIP', // renamed from "App Build" in v3
	starter: 'AI Automation Toolkit', // retired in v3 but old subscriptions may still emit events
}

export async function POST(request: NextRequest) {
	const body = await request.text()
	const signature = request.headers.get('stripe-signature')

	if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Missing signature' } },
			{ status: 401 },
		)
	}

	let event: Stripe.Event

	try {
		event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
	} catch {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } },
			{ status: 401 },
		)
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session
		const product = session.metadata?.product
		const email = session.customer_email || session.customer_details?.email

		if (!email) {
			return NextResponse.json({ received: true })
		}

		const db = getDb()

		// Both canonical and legacy slugs map to the same audit_orders rows.
		const isOneTimePurchase =
			product === 'timeAudit' || product === 'vipBuild' || product === 'appBuild'

		if (isOneTimePurchase) {
			const productColumn = product === 'timeAudit' ? 'time_audit' : 'app_build' // db column unchanged for back-compat

			await db
				.insert(auditOrders)
				.values({
					email,
					stripeCheckoutSessionId: session.id,
					stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
					product: productColumn,
					amountCents: session.amount_total || 0,
					currency: session.currency || 'eur',
					xrayId: session.metadata?.xrayId || null,
				})
				.onConflictDoNothing()

			const productName = PRODUCT_NAMES[product] || product

			// Send purchase confirmation to buyer
			await resend.emails.send({
				from: 'Meldar <hello@meldar.ai>',
				to: email,
				subject: `Your ${productName} is on its way`,
				html: `
					<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
						<h1 style="font-size: 24px; color: #623153; margin-bottom: 16px;">Payment received</h1>
						<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
							Your <strong>${productName}</strong> is confirmed. I'll have your personalized
							report within 72 hours.
						</p>
						<p style="font-size: 15px; color: #4f434a; line-height: 1.6;">
							What happens next:
						</p>
						<ol style="font-size: 15px; color: #4f434a; line-height: 1.8; padding-left: 20px;">
							<li>I review your data personally</li>
							<li>I write your custom report</li>
							<li>You get it in your inbox within 72 hours</li>
						</ol>
						<p style="font-size: 14px; color: #81737a; margin-top: 32px;">
							Questions? Just reply to this email.<br/>
							— Gosha, Meldar founder
						</p>
					</div>
				`,
			})

			// Notify founder
			await resend.emails.send({
				from: 'Meldar <hello@meldar.ai>',
				to: 'gosha.skryuchenkov@gmail.com',
				subject: `New purchase: ${productName} from ${email}`,
				html: `
					<p><strong>${productName}</strong> purchased by ${email}</p>
					<p>Amount: EUR ${((session.amount_total || 0) / 100).toFixed(2)}</p>
					<p>Time: ${new Date().toISOString()}</p>
					<p>Stripe session: ${session.id}</p>
				`,
			})
		}

		await db
			.insert(subscribers)
			.values({
				email,
				source: 'checkout',
				foundingMember: false,
			})
			.onConflictDoNothing()
	}

	if (event.type === 'customer.subscription.created') {
		// v3 subscription product: Meldar Builder (EUR 19/mo) — entitlement
		// model lives in the user_entitlements table (added in a future task).
		// For now we log; the orchestrator's token ledger gates spend
		// independently via the EUR 2/day ceiling.
		const subscription = event.data.object as Stripe.Subscription
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
		// `items.data[0].price.product` is sometimes absent on synthesized test
		// events; defensively extract it for logging.
		const productMeta = subscription.items?.data?.[0]?.price?.product ?? 'unknown'
		console.log(
			`[stripe] subscription.created: customer=${customerId}, status=${subscription.status}, trial_end=${subscription.trial_end}, product=${productMeta}`,
		)
	}

	if (event.type === 'customer.subscription.deleted') {
		// User churn: revoke Builder entitlement here once the user_entitlements
		// table exists. For now, log so we can correlate against Stripe Dashboard.
		const subscription = event.data.object as Stripe.Subscription
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
		console.log(
			`[stripe] subscription.deleted: customer=${customerId}, status=${subscription.status}`,
		)
	}

	return NextResponse.json({ received: true })
}
