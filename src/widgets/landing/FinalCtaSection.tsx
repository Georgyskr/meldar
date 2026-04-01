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
				<styled.h2 textStyle="heading.display" color="white">
					Your data told Google everything.{' '}
					<styled.span color="#f5b3dc">It&apos;s time it told you something useful.</styled.span>
				</styled.h2>

				<styled.p textStyle="body.lead" color="white/80" maxWidth="480px">
					30 seconds. One screenshot. No signup.
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
