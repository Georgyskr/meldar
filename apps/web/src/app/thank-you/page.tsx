import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'

export const metadata: Metadata = {
	title: `Thank You | ${SITE_CONFIG.name}`,
	robots: { index: false },
}

type ProductConfig = {
	title: string
	message: string
	returnLink?: { href: string; label: string }
}

const PRODUCTS: Record<string, ProductConfig> = {
	timeAudit: {
		title: 'Base — Full Analysis unlocked',
		message:
			"I'll review your data and send your personalized report within 72 hours. You'll hear from me at the email you used at checkout.",
		returnLink: { href: '/start', label: 'Return to your analysis' },
	},
	appBuild: {
		title: 'Build — Handcrafted Repo is booked',
		message: "I'll reach out within 24 hours to kick off your project. Keep an eye on your inbox.",
		returnLink: { href: '/start', label: 'Return to your analysis' },
	},
	starter: {
		title: 'Starter — Free Trial has started',
		message:
			"You have 7 days of full access. Upload your ChatGPT, Claude, and Google data to get the deepest analysis. We'll email you before the trial ends.",
		returnLink: { href: '/start', label: 'Return to your analysis' },
	},
}

const DEFAULT_PRODUCT: ProductConfig = {
	title: 'Payment received',
	message:
		"I'll follow up at the email you used at checkout. You should hear from me within 72 hours.",
	returnLink: { href: '/start', label: 'Return to your analysis' },
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
				{config.returnLink && (
					<styled.a
						href={config.returnLink.href}
						paddingInline={6}
						paddingBlock={3}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						borderRadius="md"
						fontSize="sm"
						fontWeight="700"
						fontFamily="heading"
						color="white"
						textDecoration="none"
						_hover={{ opacity: 0.9 }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						{config.returnLink.label}
					</styled.a>
				)}
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
