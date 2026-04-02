'use client'

import { Flex, styled } from '@styled-system/jsx'
import { requestConsentReopen } from '@/features/cookie-consent'
import { requestDataTermsReopen } from '@/features/discovery-flow/lib/data-terms'

export function Footer() {
	return (
		<styled.footer
			paddingBlock={8}
			paddingInline={{ base: 5, md: 12 }}
			borderBlockStart="1px solid"
			borderColor="outlineVariant/10"
			bg="surfaceContainer/50"
		>
			<Flex
				maxWidth="breakpoint-xl"
				marginInline="auto"
				flexDir={{ base: 'column', md: 'row' }}
				justifyContent="space-between"
				alignItems="center"
				gap={4}
			>
				<Flex alignItems="center" gap={6}>
					<styled.span
						fontFamily="heading"
						fontSize="lg"
						fontWeight="700"
						letterSpacing="-0.04em"
						color="primary"
					>
						Meldar
					</styled.span>
					<styled.span
						textTransform="uppercase"
						letterSpacing="widest"
						fontSize="3xs"
						fontWeight="500"
						color="onSurface/30"
					>
						&copy; {new Date().getFullYear()} ClickTheRoadFi Oy &middot; Y-tunnus 3362511-1
					</styled.span>
					<styled.span fontSize="3xs" color="onSurface/20">
						Built in Helsinki with AI
					</styled.span>
				</Flex>

				<Flex gap={8}>
					<FooterLink href="/privacy-policy">Privacy</FooterLink>
					<FooterLink href="/terms">Terms</FooterLink>
					<styled.button
						textTransform="uppercase"
						letterSpacing="widest"
						fontSize="3xs"
						fontWeight="500"
						color="onSurface/30"
						bg="transparent"
						border="none"
						cursor="pointer"
						_hover={{ color: 'primary' }}
						onClick={() => requestConsentReopen()}
					>
						Cookie Settings
					</styled.button>
					<styled.button
						textTransform="uppercase"
						letterSpacing="widest"
						fontSize="3xs"
						fontWeight="500"
						color="onSurface/30"
						bg="transparent"
						border="none"
						cursor="pointer"
						_hover={{ color: 'primary' }}
						onClick={() => requestDataTermsReopen()}
					>
						Data Terms
					</styled.button>
					<FooterLink href="mailto:gosha.skryuchenkov@gmail.com">Contact</FooterLink>
				</Flex>
			</Flex>
		</styled.footer>
	)
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<styled.a
			href={href}
			textTransform="uppercase"
			letterSpacing="widest"
			fontSize="3xs"
			fontWeight="500"
			color="onSurface/30"
			textDecoration="none"
			transition="color 0.2s ease"
			_hover={{ color: 'primary' }}
		>
			{children}
		</styled.a>
	)
}
