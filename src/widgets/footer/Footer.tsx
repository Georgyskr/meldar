'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { requestConsentReopen } from '@/features/cookie-consent'
import { requestDataTermsReopen } from '@/features/discovery-flow/lib/data-terms'

export function Footer() {
	return (
		<styled.footer
			paddingBlock={{ base: 12, md: 16 }}
			paddingInline={{ base: 6, md: 12 }}
			borderBlockStart="1px solid"
			borderColor="outlineVariant/10"
			bg="#1a1c1a"
			color="white/40"
		>
			<Grid
				maxWidth="breakpoint-xl"
				marginInline="auto"
				columns={{ base: 2, md: 4 }}
				gap={{ base: 10, md: 8 }}
			>
				{/* Brand column */}
				<VStack alignItems="flex-start" gap={4} gridColumn={{ base: '1 / -1', md: 'auto' }}>
					<styled.span
						fontFamily="heading"
						fontSize="xl"
						fontWeight="800"
						letterSpacing="-0.04em"
						color="white"
					>
						Meldar
					</styled.span>
					<styled.p fontSize="xs" color="white/30" lineHeight="1.6" maxWidth="240px">
						Your data. Your AI. Learn to fish or fall behind.
					</styled.p>
				</VStack>

				{/* Product column */}
				<VStack alignItems="flex-start" gap={3}>
					<FooterHeading>Product</FooterHeading>
					<FooterLink href="/start">Get started</FooterLink>
					<FooterLink href="/xray">Free scan</FooterLink>
					<FooterLink href="/discover">Discover</FooterLink>
				</VStack>

				{/* Legal column */}
				<VStack alignItems="flex-start" gap={3}>
					<FooterHeading>Legal</FooterHeading>
					<FooterLink href="/privacy-policy">Privacy</FooterLink>
					<FooterLink href="/terms">Terms</FooterLink>
					<FooterButton onClick={() => requestConsentReopen()}>Cookies</FooterButton>
					<FooterButton onClick={() => requestDataTermsReopen()}>Data terms</FooterButton>
				</VStack>

				{/* Company column */}
				<VStack alignItems="flex-start" gap={3}>
					<FooterHeading>Company</FooterHeading>
					<FooterLink href="mailto:gosha.skryuchenkov@gmail.com">Contact</FooterLink>
					<styled.span fontSize="xs" color="white/20">
						ClickTheRoadFi Oy
					</styled.span>
					<styled.span fontSize="xs" color="white/20">
						Helsinki, Finland
					</styled.span>
				</VStack>
			</Grid>

			{/* Bottom bar */}
			<Box
				maxWidth="breakpoint-xl"
				marginInline="auto"
				marginBlockStart={12}
				paddingBlockStart={6}
				borderBlockStart="1px solid"
				borderColor="white/6"
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					flexDir={{ base: 'column', md: 'row' }}
					gap={3}
				>
					<styled.span fontSize="2xs" color="white/20">
						&copy; {new Date().getFullYear()} ClickTheRoadFi Oy &middot; Y-tunnus 3362511-1
					</styled.span>
					<styled.span fontSize="2xs" color="white/15">
						Built in Helsinki with AI
					</styled.span>
				</Flex>
			</Box>
		</styled.footer>
	)
}

function FooterHeading({ children }: { children: React.ReactNode }) {
	return (
		<styled.span
			fontSize="xs"
			fontWeight="600"
			fontFamily="heading"
			color="white/60"
			textTransform="uppercase"
			letterSpacing="0.08em"
			marginBlockEnd={1}
		>
			{children}
		</styled.span>
	)
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<styled.a
			href={href}
			fontSize="sm"
			color="white/35"
			textDecoration="none"
			transition="color 0.2s ease"
			_hover={{ color: 'white/70' }}
		>
			{children}
		</styled.a>
	)
}

function FooterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
	return (
		<styled.button
			fontSize="sm"
			color="white/35"
			bg="transparent"
			border="none"
			padding={0}
			cursor="pointer"
			transition="color 0.2s ease"
			_hover={{ color: 'white/70' }}
		>
			{children}
		</styled.button>
	)
}
