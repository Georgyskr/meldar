'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

const IOS_STEPS = [
	{
		step: 1,
		title: 'Open Settings',
		desc: 'Find the Settings app on your home screen',
		visual: 'Settings',
	},
	{
		step: 2,
		title: 'Tap Screen Time',
		desc: 'Scroll down and tap Screen Time',
		visual: 'Screen Time',
	},
	{
		step: 3,
		title: 'See All App & Website Activity',
		desc: 'Tap to see the full breakdown',
		visual: 'See All Activity',
	},
	{
		step: 4,
		title: 'Select "Week" and screenshot',
		desc: 'Toggle to Week view, then take a screenshot of the app list',
		visual: 'Week + Screenshot',
	},
]

const ANDROID_STEPS = [
	{
		step: 1,
		title: 'Open Settings',
		desc: 'Find Settings in your app drawer',
		visual: 'Settings',
	},
	{
		step: 2,
		title: 'Digital Wellbeing',
		desc: 'Tap Digital Wellbeing & parental controls',
		visual: 'Digital Wellbeing',
	},
	{
		step: 3,
		title: 'Dashboard',
		desc: 'Tap the dashboard to see your app usage',
		visual: 'Dashboard',
	},
	{
		step: 4,
		title: 'Screenshot the list',
		desc: 'Take a screenshot of your app usage list',
		visual: 'Screenshot',
	},
]

export function ScreenshotGuide({ onDismiss }: { onDismiss: () => void }) {
	const [platform, setPlatform] = useState<'ios' | 'android'>(() => {
		if (typeof navigator === 'undefined') return 'ios'
		return /android/i.test(navigator.userAgent) ? 'android' : 'ios'
	})
	const [currentStep, setCurrentStep] = useState(0)

	const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS
	const step = steps[currentStep]
	const isLast = currentStep === steps.length - 1

	return (
		<Box
			width="100%"
			maxWidth="440px"
			marginInline="auto"
			borderRadius="xl"
			overflow="hidden"
			bg="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant/20"
		>
			{/* Platform toggle */}
			<Flex
				bg="surfaceContainer"
				paddingInline={4}
				paddingBlock={2}
				justifyContent="space-between"
				alignItems="center"
			>
				<Flex gap={1}>
					<styled.button
						onClick={() => {
							setPlatform('ios')
							setCurrentStep(0)
						}}
						paddingInline={3}
						paddingBlock={1}
						borderRadius="full"
						fontSize="xs"
						fontWeight="500"
						border="none"
						cursor="pointer"
						bg={platform === 'ios' ? 'primary' : 'transparent'}
						color={platform === 'ios' ? 'white' : 'onSurfaceVariant'}
						transition="all 0.15s ease"
					>
						iPhone
					</styled.button>
					<styled.button
						onClick={() => {
							setPlatform('android')
							setCurrentStep(0)
						}}
						paddingInline={3}
						paddingBlock={1}
						borderRadius="full"
						fontSize="xs"
						fontWeight="500"
						border="none"
						cursor="pointer"
						bg={platform === 'android' ? 'primary' : 'transparent'}
						color={platform === 'android' ? 'white' : 'onSurfaceVariant'}
						transition="all 0.15s ease"
					>
						Android
					</styled.button>
				</Flex>
				<styled.button
					onClick={onDismiss}
					fontSize="xs"
					color="onSurfaceVariant/60"
					bg="transparent"
					border="none"
					cursor="pointer"
					_hover={{ color: 'onSurface' }}
				>
					I know how
				</styled.button>
			</Flex>

			{/* Step content */}
			<VStack gap={3} padding={5} alignItems="stretch">
				{/* Step indicator dots */}
				<Flex gap={2} justifyContent="center">
					{steps.map((_, i) => (
						<Box
							key={`step-${steps[i].step}`}
							width="8px"
							height="8px"
							borderRadius="full"
							bg={i === currentStep ? 'primary' : 'outlineVariant/30'}
							transition="background 0.2s ease"
						/>
					))}
				</Flex>

				{/* Visual mockup */}
				<Flex
					justifyContent="center"
					alignItems="center"
					height="80px"
					borderRadius="lg"
					bg="surfaceContainer"
				>
					<VStack gap={0}>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="sm" color="primary">
							Step {step.step}
						</styled.span>
						<styled.span fontSize="xs" color="onSurfaceVariant">
							{step.visual}
						</styled.span>
					</VStack>
				</Flex>

				{/* Step text */}
				<VStack gap={1}>
					<styled.p fontFamily="heading" fontWeight="700" fontSize="md" color="onSurface">
						{step.title}
					</styled.p>
					<styled.p textStyle="body.sm" color="onSurfaceVariant">
						{step.desc}
					</styled.p>
				</VStack>

				{/* Navigation */}
				<styled.button
					onClick={() => {
						if (isLast) {
							onDismiss()
						} else {
							setCurrentStep((s) => s + 1)
						}
					}}
					display="flex"
					alignItems="center"
					justifyContent="center"
					gap={1}
					width="100%"
					paddingBlock={3}
					background={
						isLast ? 'linear-gradient(135deg, #623153 0%, #FFB876 100%)' : 'surfaceContainerHigh'
					}
					color={isLast ? 'white' : 'onSurface'}
					fontFamily="heading"
					fontWeight="600"
					fontSize="sm"
					borderRadius="md"
					border="none"
					cursor="pointer"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.9 }}
				>
					{isLast ? 'Got it — upload my screenshot' : 'Next'}
					<ChevronRight size={16} />
				</styled.button>
			</VStack>
		</Box>
	)
}
