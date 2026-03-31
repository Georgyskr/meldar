import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Lock } from 'lucide-react'

type AppData = {
	name: string
	description: string
	whyThisUser: string
	complexity?: 'beginner' | 'intermediate'
	estimatedBuildTime?: string
}

type LockedRecommendationCardProps = {
	app: AppData
	position: 'first' | 'second' | 'third'
	index: number
	/** Whether to include stagger animation delay */
	animationDelay?: number
}

export function LockedRecommendationCard({
	app,
	position,
	index,
	animationDelay,
}: LockedRecommendationCardProps) {
	const isBlurred = position === 'first' || position === 'third'
	const isVisible = position === 'second'

	return (
		<Box
			key={`${position}-${app.name}`}
			width="100%"
			borderRadius="16px"
			border="1px solid"
			borderColor={isVisible ? 'primary/20' : 'outlineVariant/15'}
			bg="surfaceContainerLowest"
			overflow="hidden"
			position="relative"
			style={
				animationDelay != null
					? { animation: `staggerFadeIn 0.4s ease-out ${animationDelay}s both` }
					: undefined
			}
		>
			{/* Blurred overlay for locked cards */}
			{isBlurred && (
				<>
					<Box
						position="absolute"
						inset={0}
						zIndex={2}
						display="flex"
						flexDirection="column"
						alignItems="center"
						justifyContent="center"
						gap={2}
						bg="surfaceContainerLowest/60"
						backdropFilter="blur(6px)"
					>
						<Box
							width="40px"
							height="40px"
							borderRadius="full"
							bg="primary/10"
							display="flex"
							alignItems="center"
							justifyContent="center"
						>
							<Lock size={18} color="#623153" />
						</Box>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="sm" color="primary">
							Unlock to see your #{index === 0 ? 1 : 3} recommendation
						</styled.span>
					</Box>

					{/* Honeypot content — not the real recommendation */}
					<VStack gap={2} padding={5} aria-hidden="true">
						<styled.span fontFamily="heading" fontWeight="700" fontSize="md" color="onSurface">
							Removing the CSS doesn&apos;t show this. Nice try.
						</styled.span>
						<styled.span textStyle="body.sm" color="onSurfaceVariant">
							The real recommendation is generated server-side and only revealed after payment.
						</styled.span>
					</VStack>
				</>
			)}

			{/* Visible card content */}
			{isVisible && (
				<VStack gap={3} padding={5} alignItems="flex-start">
					<Flex gap={2} alignItems="center">
						<styled.span fontFamily="heading" fontWeight="800" fontSize="lg" color="onSurface">
							{app.name}
						</styled.span>
						{app.complexity && (
							<styled.span
								fontSize="xs"
								fontWeight="600"
								color="primary"
								bg="primary/8"
								paddingInline={2}
								paddingBlock={0.5}
								borderRadius="md"
							>
								{app.complexity}
							</styled.span>
						)}
					</Flex>
					<styled.p textStyle="body.base" color="onSurfaceVariant">
						{app.description}
					</styled.p>
					<Box
						width="100%"
						padding={4}
						borderRadius="12px"
						bg="primary/4"
						border="1px solid"
						borderColor="primary/10"
					>
						<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.6">
							<styled.span fontWeight="600" color="primary">
								Why you:
							</styled.span>{' '}
							{app.whyThisUser}
						</styled.p>
					</Box>
					{app.estimatedBuildTime && (
						<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
							Estimated build time: {app.estimatedBuildTime}
						</styled.span>
					)}
				</VStack>
			)}
		</Box>
	)
}
