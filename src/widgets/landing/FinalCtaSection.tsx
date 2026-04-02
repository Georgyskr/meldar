import { Box, styled, VStack } from '@styled-system/jsx'

export function FinalCtaSection() {
	return (
		<styled.section
			paddingBlock={40}
			paddingInline={8}
			background="linear-gradient(180deg, #481b3c 0%, #2f312f 100%)"
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
					background="linear-gradient(135deg, #FFB876 0%, #ffffff 50%, #FFB876 100%)"
					backgroundSize="200% 200%"
					color="#623153"
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					borderRadius="md"
					textDecoration="none"
					transition="all 0.3s ease"
					boxShadow="0 4px 20px rgba(255, 184, 118, 0.3)"
					style={{ animation: 'pulseGlow 3s ease-in-out infinite' }}
					_hover={{
						boxShadow: '0 6px 28px rgba(255, 184, 118, 0.5)',
						transform: 'translateY(-1px)',
					}}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: '#FFB876',
						outlineOffset: '2px',
					}}
				>
					Start here — it&apos;s free
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</styled.a>
			</VStack>
		</styled.section>
	)
}
