import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import type { ReactNode } from 'react'

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
					<styled.span
						fontFamily="heading"
						fontWeight="700"
						fontSize="sm"
						color="white"
						letterSpacing="0.05em"
						textTransform="uppercase"
					>
						{label}
					</styled.span>
					<styled.span fontSize="xs" color="white/70" fontFamily="body">
						meldar.ai
					</styled.span>
				</Flex>

				<VStack gap={0} padding={5}>
					{/* Big stat */}
					<VStack gap={0} paddingBlock={4} textAlign="center" width="100%">
						<styled.span textStyle="body.sm" color="onSurfaceVariant">
							{bigStatLabel}
						</styled.span>
						<styled.span
							fontFamily="heading"
							fontWeight="800"
							fontSize="4xl"
							color={colors.text}
							letterSpacing="-0.03em"
							lineHeight="1"
							paddingBlockStart={1}
						>
							{bigStat}
						</styled.span>
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
								<styled.span
									textStyle="body.sm"
									color={row.highlight ? 'onSurface' : 'onSurfaceVariant'}
									fontWeight={row.highlight ? '500' : '300'}
								>
									{row.label}
								</styled.span>
								<styled.span
									textStyle="body.sm"
									fontWeight="500"
									fontFamily="heading"
									color={row.highlight ? colors.text : 'onSurface'}
								>
									{row.value}
								</styled.span>
							</Flex>
						))}
					</VStack>

					{/* Insight */}
					{insight && (
						<>
							<Box width="100%" height="1px" bg="outlineVariant/20" />
							<Box paddingBlock={4}>
								<styled.p textStyle="body.sm" color="onSurface" fontStyle="italic" lineHeight="1.6">
									&ldquo;{insight}&rdquo;
								</styled.p>
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
