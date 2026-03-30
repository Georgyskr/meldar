import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'

export const metadata: Metadata = {
	title: `Thank You | ${SITE_CONFIG.name}`,
	robots: { index: false },
}

export default function ThankYouPage() {
	return (
		<styled.main paddingBlock={24} paddingInline={6} minHeight="100dvh">
			<VStack gap={6} maxWidth="480px" marginInline="auto" textAlign="center">
				<styled.span fontSize="5xl">&#10003;</styled.span>
				<styled.h1
					fontFamily="heading"
					fontSize="2xl"
					fontWeight="800"
					color="onSurface"
					letterSpacing="-0.02em"
				>
					Payment received
				</styled.h1>
				<styled.p textStyle="body.base" color="onSurfaceVariant" lineHeight="1.7">
					Your Time Audit is on its way. I&apos;ll have your personalized report within 72 hours.
					Check your email for confirmation.
				</styled.p>
				<styled.p textStyle="body.sm" color="onSurfaceVariant/60">
					Questions? Reply to the confirmation email — it goes straight to me.
				</styled.p>
				<styled.a
					href="/"
					paddingInline={6}
					paddingBlock={3}
					bg="surfaceContainerHigh"
					borderRadius="md"
					fontSize="sm"
					fontWeight="500"
					color="primary"
					textDecoration="none"
					_hover={{ opacity: 0.8 }}
				>
					Back to Meldar
				</styled.a>
			</VStack>
		</styled.main>
	)
}
