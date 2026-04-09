import { Box, VStack } from '@styled-system/jsx'
import type { UpsellHook } from '@/entities/xray-result/model/types'
import { Text } from '@/shared/ui'
import { PurchaseButton } from './PurchaseButton'

/**
 * Maps the upsell scoring tier (output by the AI) to a Meldar product.
 *
 * v3 changes (2026-04-06):
 * - `app_build` → canonical `vipBuild` slug ("Skip-the-Line VIP")
 * - `starter`   → canonical `builder` slug ("Meldar Builder", EUR 19/mo
 *                 subscription replacing the retired EUR 9.99 toolkit)
 * - `concierge` also points at `builder` since the contact-us flow shares
 *   the same destination for now
 *
 * The historical `tierTarget` values in the database are unchanged — we
 * simply map them to the new product catalog at the UI boundary.
 */
const TIER_TO_PRODUCT = {
	audit: { product: 'timeAudit' as const, label: 'Personal Time Audit — EUR 29', price: '29' },
	app_build: {
		product: 'vipBuild' as const,
		label: 'Skip-the-Line VIP — EUR 79',
		price: '79',
	},
	starter: {
		product: 'builder' as const,
		label: 'Meldar Builder — EUR 19/mo',
		price: '19',
	},
	concierge: { product: 'builder' as const, label: 'Contact us', price: '' },
} as const

export function UpsellBlock({ upsells, xrayId }: { upsells: UpsellHook[]; xrayId: string }) {
	if (upsells.length === 0) return null

	const sorted = [...upsells].sort((a, b) => {
		const order = { high: 0, medium: 1, low: 2 }
		return order[a.urgency] - order[b.urgency]
	})
	const top = sorted[0]
	const config = TIER_TO_PRODUCT[top.tierTarget]

	return (
		<Box
			width="100%"
			maxWidth="440px"
			marginInline="auto"
			padding={5}
			borderRadius="xl"
			border="1px solid"
			borderColor="outlineVariant/20"
			bg="surfaceContainerLowest"
		>
			<VStack gap={3} alignItems="stretch">
				<Text as="p" textStyle="secondary.sm" color="onSurface">
					{top.message}
				</Text>
				<PurchaseButton product={config.product} xrayId={xrayId} label={config.label} />
				<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant/60" textAlign="center">
					Full refund if we can&apos;t deliver. No questions asked.
				</Text>
			</VStack>
		</Box>
	)
}
