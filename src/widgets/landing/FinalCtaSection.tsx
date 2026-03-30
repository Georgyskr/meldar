import { Box, styled, VStack } from '@styled-system/jsx'
import { EmailCapture } from '@/shared/ui'

export function FinalCtaSection() {
	return (
		<styled.section
			paddingBlock={40}
			paddingInline={8}
			bg="inverseSurface"
			color="inverseOnSurface"
			position="relative"
			overflow="hidden"
		>
			<Box
				position="absolute"
				top="-150px"
				left="50%"
				transform="translateX(-50%)"
				width="800px"
				height="400px"
				borderRadius="full"
				background="radial-gradient(ellipse, rgba(98,49,83,0.15) 0%, transparent 70%)"
				pointerEvents="none"
			/>

			<VStack
				maxWidth="breakpoint-md"
				marginInline="auto"
				gap={8}
				alignItems="center"
				textAlign="center"
				position="relative"
				zIndex={1}
			>
				<styled.h2
					fontFamily="heading"
					fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
					fontWeight="700"
					letterSpacing="-0.03em"
					lineHeight="tight"
					color="white"
				>
					Google made ~$238 from your data last year.{' '}
					<styled.span color="#f5b3dc">What did you get?</styled.span>
				</styled.h2>

				<styled.p textStyle="body.lead" color="white/80" maxWidth="480px">
					Take your data back. See your Time X-Ray. Get the hours they owe you.
				</styled.p>

				<EmailCapture dark />
			</VStack>
		</styled.section>
	)
}
