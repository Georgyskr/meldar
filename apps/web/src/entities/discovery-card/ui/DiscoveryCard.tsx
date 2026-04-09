import { Box, Flex, VStack } from '@styled-system/jsx'
import type { ReactNode } from 'react'
import { Text } from '@/shared/ui'

export type DiscoveryCardProps = {
	/** Tool label shown in gradient header */
	label: string
	/** Large stat number (e.g., "7.4 hrs/day", "EUR 47/mo", "23 hrs/year") */
	bigStat: string
	/** Label above the big stat */
	bigStatLabel: string
	/** Severity affects the gradient intensity */
	severity: 'low' | 'medium' | 'high'
	/** Rows of data */
	rows: { label: string; value: string; highlight?: boolean }[]
	/** Bottom insight quote */
	insight?: string
	/** Extra content below the card (actions, upsells) */
	children?: ReactNode
}

const SEVERITY_COLORS = {
	low: { bg: 'linear-gradient(135deg, #4a7c59 0%, #8fbc8f 100%)', text: '#2d5a3d' },
	medium: { bg: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)', text: '#623153' },
	high: { bg: 'linear-gradient(135deg, #8b2252 0%, #ff6b6b 100%)', text: '#8b2252' },
}

export function DiscoveryCard({
	label,
	bigStat,
	bigStatLabel,
	severity,
	rows,
	insight,
	children,
}: DiscoveryCardProps) {
	const colors = SEVERITY_COLORS[severity]

	return (
		<VStack gap={0} width="100%" maxWidth="440px" marginInline="auto">
			<Box
				width="100%"
				borderRadius="xl"
				overflow="hidden"
				bg="surfaceContainerLowest"
				boxShadow="0 4px 24px rgba(0,0,0,0.08)"
			>
				{/* Gradient header */}
				<Flex
					justifyContent="space-between"
					alignItems="center"
					paddingInline={5}
					paddingBlock={3}
					background={colors.bg}
				>
					<Text textStyle="tertiary.xl" color="white">
						{label}
					</Text>
					<Text textStyle="secondary.xs" color="white/70">
						meldar.ai
					</Text>
				</Flex>

				<VStack gap={0} padding={5}>
					{/* Big stat */}
					<VStack gap={0} paddingBlock={4} textAlign="center" width="100%">
						<Text textStyle="secondary.sm" color="onSurfaceVariant">
							{bigStatLabel}
						</Text>
						<Text textStyle="primary.xl" color={colors.text} paddingBlockStart={1}>
							{bigStat}
						</Text>
					</VStack>

					{/* Divider */}
					<Box width="100%" height="1px" bg="outlineVariant/20" />

					{/* Data rows */}
					<VStack gap={0} width="100%" paddingBlock={3}>
						{rows.map((row) => (
							<Flex
								key={row.label}
								justifyContent="space-between"
								alignItems="center"
								width="100%"
								paddingBlock={2}
							>
								<Text
									textStyle="secondary.sm"
									color={row.highlight ? 'onSurface' : 'onSurfaceVariant'}
								>
									{row.label}
								</Text>
								<Text textStyle="secondary.sm" color={row.highlight ? colors.text : 'onSurface'}>
									{row.value}
								</Text>
							</Flex>
						))}
					</VStack>

					{/* Insight */}
					{insight && (
						<>
							<Box width="100%" height="1px" bg="outlineVariant/20" />
							<Box paddingBlock={4}>
								<Text as="p" textStyle="secondary.sm" color="onSurface">
									&ldquo;{insight}&rdquo;
								</Text>
							</Box>
						</>
					)}
				</VStack>
			</Box>

			{/* Children (share actions, upsells, etc.) */}
			{children}
		</VStack>
	)
}
