import { Box, Flex, VStack } from '@styled-system/jsx'
import { Lock } from 'lucide-react'
import { Text } from '@/shared/ui'

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
						<Text textStyle="primary.xs" color="primary">
							Unlock to see your #{index === 0 ? 1 : 3} recommendation
						</Text>
					</Box>

					{/* Honeypot content — not the real recommendation */}
					<VStack gap={2} padding={5} aria-hidden="true">
						<Text textStyle="primary.xs" color="onSurface">
							Removing the CSS doesn&apos;t show this. Nice try.
						</Text>
						<Text textStyle="secondary.sm" color="onSurfaceVariant">
							The real recommendation is generated server-side and only revealed after payment.
						</Text>
					</VStack>
				</>
			)}

			{/* Visible card content */}
			{isVisible && (
				<VStack gap={3} padding={5} alignItems="flex-start">
					<Flex gap={2} alignItems="center">
						<Text textStyle="primary.sm" color="onSurface">
							{app.name}
						</Text>
						{app.complexity && (
							<Text
								textStyle="primary.xs"
								color="primary"
								bg="primary/8"
								paddingInline={2}
								paddingBlock={0.5}
								borderRadius="md"
							>
								{app.complexity}
							</Text>
						)}
					</Flex>
					<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
						{app.description}
					</Text>
					<Box
						width="100%"
						padding={4}
						borderRadius="12px"
						bg="primary/4"
						border="1px solid"
						borderColor="primary/10"
					>
						<Text as="p" textStyle="secondary.sm" color="onSurface">
							<Text textStyle="primary.xs" color="primary">
								Why you:
							</Text>{' '}
							{app.whyThisUser}
						</Text>
					</Box>
					{app.estimatedBuildTime && (
						<Text textStyle="secondary.sm" color="onSurfaceVariant/60">
							Estimated build time: {app.estimatedBuildTime}
						</Text>
					)}
				</VStack>
			)}
		</Box>
	)
}
