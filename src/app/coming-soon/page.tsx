import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'
import { EmailCapture } from '@/shared/ui/EmailCapture'

export const metadata: Metadata = {
	title: `Coming Soon | ${SITE_CONFIG.name}`,
	robots: { index: false },
}

export default function ComingSoonPage() {
	return (
		<styled.main paddingBlock={24} paddingInline={6} minHeight="100dvh">
			<VStack gap={6} maxWidth="480px" marginInline="auto" textAlign="center">
				<styled.span fontSize="5xl">&#128295;</styled.span>
				<styled.h1
					fontFamily="heading"
					fontSize="2xl"
					fontWeight="800"
					color="onSurface"
					letterSpacing="-0.02em"
				>
					AI Automation Toolkit is getting ready
				</styled.h1>
				<styled.p textStyle="body.base" color="onSurfaceVariant" lineHeight="1.7">
					We&apos;re building a solid collection of SOPs, video walkthroughs, and automation
					templates before we open this up. Leave your email and you&apos;ll be first to know.
				</styled.p>

				<EmailCapture />

				<VStack gap={3} paddingBlockStart={4}>
					<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
						In the meantime:
					</styled.p>
					<styled.a
						href="https://twitter.com/meldar_ai"
						target="_blank"
						rel="noopener noreferrer"
						textStyle="body.sm"
						color="primary"
						textDecoration="none"
						_hover={{ textDecoration: 'underline' }}
					>
						Follow us on Twitter/X &rarr;
					</styled.a>
					<styled.a
						href="https://discord.gg/meldar"
						target="_blank"
						rel="noopener noreferrer"
						textStyle="body.sm"
						color="primary"
						textDecoration="none"
						_hover={{ textDecoration: 'underline' }}
					>
						Join our Discord &rarr;
					</styled.a>
				</VStack>

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
					marginBlockStart={4}
					_hover={{ opacity: 0.8 }}
				>
					Back to Meldar
				</styled.a>
			</VStack>
		</styled.main>
	)
}
