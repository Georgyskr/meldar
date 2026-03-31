import { styled, VStack } from '@styled-system/jsx'

export default function StartNotFound() {
	return (
		<styled.main paddingBlock={24} paddingInline={6} minHeight="100dvh">
			<VStack gap={6} maxWidth="440px" marginInline="auto" textAlign="center">
				<styled.span fontSize="4xl">&#128269;</styled.span>
				<styled.h1
					fontFamily="heading"
					fontSize="2xl"
					fontWeight="800"
					color="onSurface"
					letterSpacing="-0.02em"
				>
					This analysis has expired or doesn&apos;t exist
				</styled.h1>
				<styled.p textStyle="body.base" color="onSurfaceVariant" lineHeight="1.7">
					Analysis results are automatically deleted after 30 days to protect your privacy. Want to
					start fresh?
				</styled.p>
				<styled.a
					href="/start"
					paddingInline={6}
					paddingBlock={3}
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					borderRadius="md"
					fontFamily="heading"
					fontWeight="700"
					fontSize="sm"
					textDecoration="none"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.9 }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					Start your own analysis
				</styled.a>
			</VStack>
		</styled.main>
	)
}
