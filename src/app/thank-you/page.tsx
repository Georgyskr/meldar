import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'

export const metadata: Metadata = {
	title: `Thank You | ${SITE_CONFIG.name}`,
	robots: { index: false },
}

const PRODUCTS: Record<string, { title: string; message: string }> = {
	timeAudit: {
		title: 'Your Time Audit is on its way',
		message:
			"I'll review your data and send your personalized report within 72 hours. You'll hear from me at the email you used at checkout.",
	},
	appBuild: {
		title: 'Your App Build is booked',
		message: "I'll reach out within 24 hours to kick off your project. Keep an eye on your inbox.",
	},
	starter: {
		title: "You're in",
		message:
			"Your AI Automation Toolkit is ready. I'll send setup instructions to your email shortly.",
	},
}

const DEFAULT_PRODUCT = {
	title: 'Payment received',
	message:
		"I'll follow up at the email you used at checkout. You should hear from me within 72 hours.",
}

type PageProps = {
	searchParams: Promise<{ product?: string }>
}

export default async function ThankYouPage({ searchParams }: PageProps) {
	const { product } = await searchParams
	const config = (product && PRODUCTS[product]) || DEFAULT_PRODUCT

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
					{config.title}
				</styled.h1>
				<styled.p textStyle="body.base" color="onSurfaceVariant" lineHeight="1.7">
					{config.message}
				</styled.p>
				<styled.p textStyle="body.sm" color="onSurfaceVariant/60">
					Questions? Email georgy@meldar.ai — I reply to everything.
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
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					Back to Meldar
				</styled.a>
			</VStack>
		</styled.main>
	)
}
