export const STRIPE_PRICES = {
	timeAudit: 'price_1TGgkpE6hO9BfX87JM1IzXi0',
	appBuild: 'price_1TGgljE6hO9BfX87akbRkjWB',
	starter: 'price_1TGh4OE6hO9BfX87mwRCGpjX',
} as const

export type ProductSlug = keyof typeof STRIPE_PRICES

export const PRODUCT_META: Record<ProductSlug, { name: string; mode: 'payment' | 'subscription' }> =
	{
		timeAudit: { name: 'Personal Time Audit', mode: 'payment' },
		appBuild: { name: 'App Build', mode: 'payment' },
		starter: { name: 'AI Automation Toolkit', mode: 'subscription' },
	}
