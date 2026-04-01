import { Box, styled, VStack } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'

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
					Take your data back. See what to build. Do it yourself.
				</styled.p>

				<styled.a
					href="/start"
					display="inline-flex"
					alignItems="center"
					gap={2}
					paddingInline={8}
					paddingBlock={4}
					background="white"
					color="#623153"
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					borderRadius="md"
					textDecoration="none"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.9 }}
				>
					Start here — it&apos;s free
					<ArrowRight size={18} />
				</styled.a>
			</VStack>
		</styled.section>
	)
}
