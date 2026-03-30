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

	return (
		<Box
			width="100%"
			maxWidth="440px"
			marginInline="auto"
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
				background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
			>
				<styled.span
					fontFamily="heading"
					fontWeight="700"
					fontSize="sm"
					color="white"
					letterSpacing="0.05em"
					textTransform="uppercase"
				>
					Your Time X-Ray
				</styled.span>
				<styled.span fontSize="xs" color="white/70" fontFamily="body">
					meldar.ai
				</styled.span>
			</Flex>

			<VStack gap={0} padding={5}>
				{/* Total screen time */}
				<Flex justifyContent="space-between" alignItems="baseline" width="100%" paddingBlock={3}>
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						Total screen time
					</styled.span>
					<styled.span fontFamily="heading" fontWeight="800" fontSize="2xl" color="onSurface">
						{totalHours} hrs/day
					</styled.span>
				</Flex>

				{/* Divider */}
				<Box width="100%" height="1px" bg="outlineVariant/20" />

				{/* App list */}
				<VStack gap={0} width="100%" paddingBlock={3}>
					{apps.slice(0, 5).map((app, i) => (
						<Flex
							key={app.name}
							justifyContent="space-between"
							alignItems="center"
							width="100%"
							paddingBlock={2}
						>
							<styled.span textStyle="body.sm" color="onSurface">
								{i + 1}. {app.name}
							</styled.span>
							<styled.span
								textStyle="body.sm"
								fontWeight="500"
								color="primary"
								fontFamily="heading"
							>
								{(app.usageMinutes / 60).toFixed(1)}h
							</styled.span>
						</Flex>
					))}
				</VStack>

				{/* Divider */}
				<Box width="100%" height="1px" bg="outlineVariant/20" />

				{/* Pickups + recoverable */}
				<Flex justifyContent="space-between" width="100%" paddingBlock={3}>
					{pickups && (
						<VStack gap={0}>
							<styled.span textStyle="body.sm" color="onSurfaceVariant">
								Daily pickups
							</styled.span>
							<styled.span fontFamily="heading" fontWeight="700" fontSize="lg" color="onSurface">
								{pickups}
							</styled.span>
						</VStack>
					)}
					<VStack gap={0} alignItems={pickups ? 'flex-end' : 'flex-start'}>
						<styled.span textStyle="body.sm" color="onSurfaceVariant">
							Top app
						</styled.span>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="lg" color="primary">
							{topApp}
						</styled.span>
					</VStack>
				</Flex>

				{/* Insight quote */}
				{topInsight && (
					<>
						<Box width="100%" height="1px" bg="outlineVariant/20" />
						<Box paddingBlock={4}>
							<styled.p textStyle="body.sm" color="onSurface" fontStyle="italic" lineHeight="1.6">
								&ldquo;{topInsight.headline}. {topInsight.comparison}.&rdquo;
							</styled.p>
						</Box>
					</>
				)}
			</VStack>
		</Box>
	)
}
