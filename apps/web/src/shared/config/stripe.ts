/**
 * Meldar Stripe product catalog (post-v3 cleanup, 2026-04-06).
 *
 * **Setup required by founder before this code goes live:**
 *
 * 1. Create the new "Builder" subscription product in Stripe Dashboard:
 *    - Name: "Meldar Builder"
 *    - Price: EUR 19.00 / month, recurring
 *    - 7-day free trial via subscription_data
 *    - Copy the price ID into env var `STRIPE_PRICE_BUILDER`
 *
 * 2. Confirm existing prices map to the right env vars:
 *    - `STRIPE_PRICE_TIME_AUDIT` = the EUR 29 personal audit (old "timeAudit")
 *    - `STRIPE_PRICE_VIP_BUILD` = the EUR 79 done-for-me build (old "appBuild",
 *       now branded "Skip-the-Line VIP")
 *
 * 3. ARCHIVE the old `starter` product (EUR 9.99 AI Automation Toolkit) in
 *    Stripe Dashboard. Existing subscribers (if any) keep their grandfathered
 *    plan; new sign-ups use Builder. Confirm zero active subscribers via
 *    Dashboard before archiving.
 *
 * 4. Set the env vars in Vercel for both preview and production environments.
 *    Without them, code falls back to the legacy hardcoded IDs (preserving
 *    backwards compatibility for the dev-mode setups that haven't migrated).
 *
 * Why env-var-driven now: each environment (dev, staging, prod) wants its own
 * Stripe test/live products. Hardcoded price IDs in source were a v1 shortcut
 * we should leave behind.
 */

/**
 * Canonical product slugs Meldar uses internally. NEVER expose Stripe price
 * IDs directly to the client — always pass these slugs and resolve server-side.
 *
 * - `timeAudit`: one-time EUR 29 personal time audit (existing v1 product)
 * - `vipBuild`:  one-time EUR 79 "Skip-the-Line VIP" done-for-me build
 *                (renamed from `appBuild` for v3 — see SLUG_LEGACY_ALIASES below)
 * - `builder`:   EUR 19/mo Meldar Builder subscription (NEW for v3)
 *
 * Retired in v3 (no longer accepted by checkout):
 * - `starter`:   EUR 9.99/mo AI Automation Toolkit
 */
export type ProductSlug = 'timeAudit' | 'vipBuild' | 'builder'

/**
 * Backwards-compat aliases. The old `appBuild` slug is still in the database
 * (audit_orders rows, xray_results metadata) and on the client side until the
 * UI is fully migrated. Map them to canonical slugs at the boundary.
 */
const LEGACY_ALIASES: Record<string, ProductSlug> = {
	appBuild: 'vipBuild',
}

/**
 * Resolve any incoming product identifier (canonical or legacy) to a canonical
 * slug, or undefined if the slug is unknown / retired.
 */
export function resolveProductSlug(input: string): ProductSlug | undefined {
	if (input === 'timeAudit' || input === 'vipBuild' || input === 'builder') {
		return input
	}
	return LEGACY_ALIASES[input]
}

/**
 * Resolve a canonical slug to the Stripe price ID for the current environment.
 * Falls back to the legacy hardcoded IDs (the original v1 prices) if the env
 * var isn't set, so existing dev environments keep working without an env file
 * update.
 */
export function getStripePriceId(slug: ProductSlug): string {
	const env = process.env
	switch (slug) {
		case 'timeAudit':
			return env.STRIPE_PRICE_TIME_AUDIT ?? 'price_1TGgkpE6hO9BfX87JM1IzXi0'
		case 'vipBuild':
			return env.STRIPE_PRICE_VIP_BUILD ?? 'price_1TGgljE6hO9BfX87akbRkjWB'
		case 'builder': {
			const id = env.STRIPE_PRICE_BUILDER
			if (!id) {
				throw new Error(
					'STRIPE_PRICE_BUILDER env var is not set. Create the Builder product in ' +
						'Stripe Dashboard and add the price ID — see src/shared/config/stripe.ts.',
				)
			}
			return id
		}
	}
}

export type ProductMeta = {
	readonly name: string
	readonly mode: 'payment' | 'subscription'
	readonly priceLabel: string
}

export const PRODUCT_META: Record<ProductSlug, ProductMeta> = {
	timeAudit: {
		name: 'Personal Time Audit',
		mode: 'payment',
		priceLabel: 'EUR 29',
	},
	vipBuild: {
		name: 'Skip-the-Line VIP',
		mode: 'payment',
		priceLabel: 'EUR 79',
	},
	builder: {
		name: 'Meldar Builder',
		mode: 'subscription',
		priceLabel: 'EUR 19/mo',
	},
}

// ── Legacy export, retained for files not yet migrated ──────────────────────
//
// These constants are deprecated. New code should use {@link getStripePriceId}
// and {@link resolveProductSlug}. Keeping the export prevents breaking the few
// remaining test files until they're migrated.

/** @deprecated Use {@link getStripePriceId} */
export const STRIPE_PRICES = {
	timeAudit: 'price_1TGgkpE6hO9BfX87JM1IzXi0',
	appBuild: 'price_1TGgljE6hO9BfX87akbRkjWB',
} as const
