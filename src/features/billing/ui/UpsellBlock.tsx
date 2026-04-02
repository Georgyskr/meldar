import { Box, styled, VStack } from '@styled-system/jsx'
import type { UpsellHook } from '@/entities/xray-result/model/types'
import { PurchaseButton } from './PurchaseButton'

const TIER_TO_PRODUCT = {
	audit: { product: 'timeAudit' as const, label: 'Personal Time Audit — EUR 29', price: '29' },
	app_build: { product: 'appBuild' as const, label: 'App Build — EUR 79', price: '79' },
	starter: {
		product: 'starter' as const,
		label: 'AI Automation Toolkit — EUR 9.99/mo',
		price: '9.99',
	},
	concierge: { product: 'starter' as const, label: 'Contact us', price: '' },
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
				<styled.p textStyle="body.sm" color="onSurface" fontWeight="500">
					{top.message}
				</styled.p>
				<PurchaseButton product={config.product} xrayId={xrayId} label={config.label} />
				<styled.p textStyle="body.sm" color="onSurfaceVariant/60" textAlign="center">
					Full refund if we can&apos;t deliver. No questions asked.
				</styled.p>
			</VStack>
		</Box>
	)
}
