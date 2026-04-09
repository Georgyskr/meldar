import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/shared/config/seo'
import { Heading, Text } from '@/shared/ui'
import { EmailCapture } from '@/shared/ui/EmailCapture'

const StyledLink = styled(Link)

export const metadata: Metadata = {
	title: `Waitlist | ${SITE_CONFIG.name}`,
	description:
		'Join the Meldar waitlist. Be first to access the full AI learning platform when premium tiers launch.',
	robots: { index: false },
}

export default function ComingSoonPage() {
	return (
		<styled.main paddingBlock={24} paddingInline={6} minHeight="100dvh">
			<VStack gap={6} maxWidth="480px" marginInline="auto" textAlign="center">
				<Text textStyle="primary.xl">&#127919;</Text>
				<Heading textStyle="primary.md" as="h1" color="onSurface">
					Premium access is coming soon
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					We&apos;re finalizing the premium tiers. Leave your email and you&apos;ll be first to know
					when they launch.
				</Text>

				<EmailCapture />

				<VStack gap={3} paddingBlockStart={4}>
					<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
						Ready to start learning AI for free?
					</Text>
					<StyledLink
						href="/sign-up"
						display="inline-flex"
						alignItems="center"
						justifyContent="center"
						paddingInline={6}
						paddingBlock={3}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						borderRadius="md"
						fontSize="sm"
						fontWeight="700"
						fontFamily="heading"
						color="white"
						textDecoration="none"
						transition="opacity 0.2s ease"
						_hover={{ opacity: 0.9 }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
					>
						Start free
					</StyledLink>
				</VStack>

				<StyledLink
					href="/"
					paddingInline={6}
					paddingBlock={3}
					bg="surfaceContainerHigh"
					borderRadius="md"
					fontSize="sm"
					fontWeight="500"
					color="primary"
					textDecoration="none"
					marginBlockStart={4}
					_hover={{ opacity: 0.8 }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					Back to Meldar
				</StyledLink>
			</VStack>
		</styled.main>
	)
}
