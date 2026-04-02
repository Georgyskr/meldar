import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import type { AppUsage, Insight } from '../model/types'

type XRayCardProps = {
	totalHours: number
	topApp: string
	apps: AppUsage[]
	pickups: number | null
	insights: Insight[]
}

export function XRayCard({ totalHours, topApp, apps, pickups, insights }: XRayCardProps) {
	const topInsight = insights[0]
	const maxMinutes = apps[0]?.usageMinutes || 1

	return (
		<Box
			width="100%"
			maxWidth="440px"
			marginInline="auto"
			borderRadius="20px"
			overflow="hidden"
			bg="surfaceContainerLowest"
			boxShadow="0 8px 40px rgba(98, 49, 83, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)"
		>
			{/* Gradient header */}
			<Box
				paddingInline={6}
				paddingBlock={5}
				background="linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)"
				position="relative"
				overflow="hidden"
			>
				{/* Subtle noise texture overlay */}
				<Box
					position="absolute"
					inset={0}
					opacity={0.06}
					background="url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')"
				/>
				<Flex justifyContent="space-between" alignItems="center" position="relative">
					<styled.span
						fontFamily="heading"
						fontWeight="700"
						fontSize="xs"
						color="white"
						letterSpacing="0.1em"
						textTransform="uppercase"
					>
						Your Digital Footprint
					</styled.span>
					<styled.span fontSize="xs" color="white/60" fontFamily="body" fontWeight="300">
						meldar.ai
					</styled.span>
				</Flex>
				{/* Big number */}
				<Flex alignItems="baseline" gap={2} marginBlockStart={4} position="relative">
					<styled.span
						fontFamily="heading"
						fontWeight="800"
						fontSize={{ base: '4xl', md: '5xl' }}
						color="white"
						lineHeight="1"
						letterSpacing="-0.03em"
					>
						{totalHours}
					</styled.span>
					<styled.span fontFamily="heading" fontWeight="500" fontSize="md" color="white/70">
						hrs/day
					</styled.span>
				</Flex>
			</Box>

			<VStack gap={0} padding={6}>
				{/* App list with bars */}
				<VStack gap={1} width="100%" paddingBlockEnd={4}>
					{apps.slice(0, 5).map((app, i) => {
						const barWidth = Math.max((app.usageMinutes / maxMinutes) * 100, 4)
						return (
							<Flex key={app.name} alignItems="center" width="100%" gap={3} paddingBlock="6px">
								<styled.span
									fontSize="xs"
									fontWeight="600"
									fontFamily="heading"
									color="onSurfaceVariant/50"
									width="16px"
									textAlign="right"
									flexShrink={0}
								>
									{i + 1}
								</styled.span>
								<styled.span
									textStyle="body.sm"
									color="onSurface"
									fontWeight="500"
									width="100px"
									flexShrink={0}
								>
									{app.name}
								</styled.span>
								<Box flex={1} position="relative" height="6px">
									<Box position="absolute" inset={0} borderRadius="full" bg="outlineVariant/8" />
									<Box
										position="absolute"
										top={0}
										left={0}
										bottom={0}
										borderRadius="full"
										background={i === 0 ? 'linear-gradient(90deg, #623153, #FFB876)' : 'primary/25'}
										transformOrigin="left"
										style={{
											width: `${barWidth}%`,
											animation: `barFill 0.6s ease-out ${0.1 + i * 0.08}s both`,
										}}
									/>
								</Box>
								<styled.span
									textStyle="body.sm"
									fontWeight="600"
									color={i === 0 ? 'primary' : 'onSurfaceVariant'}
									fontFamily="heading"
									width="40px"
									textAlign="right"
									flexShrink={0}
								>
									{(app.usageMinutes / 60).toFixed(1)}h
								</styled.span>
							</Flex>
						)
					})}
				</VStack>

				{/* Divider */}
				<Box width="100%" height="1px" bg="outlineVariant/12" />

				{/* Stats row */}
				<Flex justifyContent="space-between" width="100%" paddingBlock={4}>
					{pickups != null && (
						<VStack gap={0}>
							<styled.span
								fontSize="xs"
								color="onSurfaceVariant/60"
								textTransform="uppercase"
								letterSpacing="0.05em"
								fontWeight="500"
							>
								Daily pickups
							</styled.span>
							<styled.span
								fontFamily="heading"
								fontWeight="800"
								fontSize="xl"
								color="onSurface"
								letterSpacing="-0.02em"
								style={{ animation: 'counterUp 0.5s ease-out 0.4s both' }}
							>
								{pickups}
							</styled.span>
						</VStack>
					)}
					<VStack gap={0} alignItems={pickups != null ? 'flex-end' : 'flex-start'}>
						<styled.span
							fontSize="xs"
							color="onSurfaceVariant/60"
							textTransform="uppercase"
							letterSpacing="0.05em"
							fontWeight="500"
						>
							Top app
						</styled.span>
						<styled.span
							fontFamily="heading"
							fontWeight="800"
							fontSize="xl"
							color="primary"
							letterSpacing="-0.02em"
							style={{ animation: 'counterUp 0.5s ease-out 0.5s both' }}
						>
							{topApp}
						</styled.span>
					</VStack>
				</Flex>

				{/* Insight quote */}
				{topInsight && (
					<>
						<Box width="100%" height="1px" bg="outlineVariant/12" />
						<Box paddingBlock={4}>
							<styled.p
								textStyle="body.sm"
								color="onSurface/80"
								fontStyle="italic"
								lineHeight="1.65"
								letterSpacing="0.005em"
							>
								&ldquo;{topInsight.headline}. {topInsight.comparison}.&rdquo;
							</styled.p>
						</Box>
					</>
				)}
			</VStack>
		</Box>
	)
}
