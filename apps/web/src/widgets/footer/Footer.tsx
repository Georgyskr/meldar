'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import Link from 'next/link'
import { requestConsentReopen } from '@/features/cookie-consent'
import { requestDataTermsReopen } from '@/features/discovery-flow/lib/data-terms'
import { Heading, Text } from '@/shared/ui'

const StyledLink = styled(Link)

export function Footer() {
	return (
		<styled.footer
			paddingBlock={{ base: 16, md: 20 }}
			paddingInline={{ base: 6, md: 12 }}
			bg="#0f0b0d"
			position="relative"
			overflow="hidden"
		>
			<Box
				maxWidth="breakpoint-xl"
				marginInline="auto"
				paddingBlockEnd={10}
				borderBottom="1px solid"
				borderColor="white/12"
			>
				<Flex justifyContent="space-between" alignItems="baseline" gap={6} flexWrap="wrap">
					<Text textStyle="tertiary.md" color="secondaryLight">
						Colophon · Nº 012
					</Text>
					<Text textStyle="italic.md" color="white/60">
						— printed in cream, bound in mauve.
					</Text>
				</Flex>
			</Box>

			<Grid
				maxWidth="breakpoint-xl"
				marginInline="auto"
				gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: '2fr 1fr 1fr 1fr' }}
				gap={{ base: 10, md: 12 }}
				paddingBlockStart={10}
			>
				<VStack alignItems="flex-start" gap={5} gridColumn={{ base: '1 / -1', md: 'auto' }}>
					<Flex alignItems="baseline" gap={3}>
						<Box
							width="8px"
							height="8px"
							borderRadius="full"
							bg="secondaryLight"
							boxShadow="0 0 12px #FFB876"
							style={{ animation: 'gentleBreathe 3s ease-in-out infinite' }}
						/>
						<Heading as="h2" textStyle="primary.md" color="white">
							Meldar
						</Heading>
					</Flex>
					<Text as="p" textStyle="secondary.sm" color="white/50" maxWidth="320px">
						Your data. Your AI. Nobody else&apos;s.{' '}
						<Text as="em" textStyle="italic.sm" color="white/70">
							Learn to fish or fall behind.
						</Text>
					</Text>
					<Text textStyle="tertiary.sm" color="white/30">
						Est. Helsinki · 2026
					</Text>
				</VStack>

				<FooterColumn number="I" title="Product">
					<FooterLink href="/sign-up">Sign up</FooterLink>
					<FooterLink href="/workspace">Workspace</FooterLink>
				</FooterColumn>

				<FooterColumn number="II" title="Legal">
					<FooterLink href="/privacy-policy">Privacy</FooterLink>
					<FooterLink href="/terms">Terms</FooterLink>
					<FooterButton onClick={() => requestConsentReopen()}>Cookies</FooterButton>
					<FooterButton onClick={() => requestDataTermsReopen()}>Data terms</FooterButton>
				</FooterColumn>

				<FooterColumn number="III" title="Company">
					<FooterLink href="mailto:gosha.skryuchenkov@gmail.com">Contact</FooterLink>
					<Text textStyle="italic.sm" color="white/30">
						ClickTheRoadFi Oy
					</Text>
					<Text textStyle="italic.sm" color="white/30">
						Helsinki, Finland
					</Text>
				</FooterColumn>
			</Grid>

			<Box
				maxWidth="breakpoint-xl"
				marginInline="auto"
				marginBlockStart={16}
				paddingBlockStart={8}
				borderBlockStart="1px solid"
				borderColor="white/10"
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					flexDir={{ base: 'column', md: 'row' }}
					gap={4}
				>
					<Text textStyle="tertiary.sm" color="white/30">
						&copy; {new Date().getFullYear()} ClickTheRoadFi Oy · Y-tunnus 3362511-1
					</Text>
					<Text textStyle="italic.md" color="white/50">
						— Made in Helsinki
					</Text>
				</Flex>
			</Box>
		</styled.footer>
	)
}

function FooterColumn({
	number,
	title,
	children,
}: {
	number: string
	title: string
	children: React.ReactNode
}) {
	return (
		<VStack alignItems="flex-start" gap={4}>
			<Box paddingBlockStart={3} borderTop="1px solid" borderColor="white/20" width="100%">
				<Text textStyle="tertiary.md" color="secondaryLight" display="block" marginBlockEnd={4}>
					§ {number} — {title}
				</Text>
			</Box>
			{children}
		</VStack>
	)
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
	const isExternal = href.startsWith('http') || href.startsWith('mailto:')

	if (isExternal) {
		return (
			<styled.a
				href={href}
				textDecoration="none"
				transition="all 0.2s ease"
				_hover={{ transform: 'translateX(2px)' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'secondaryLight',
					outlineOffset: '2px',
				}}
			>
				<Text textStyle="primary.xs" color="white/60" _hover={{ color: 'secondaryLight' }}>
					{children}
				</Text>
			</styled.a>
		)
	}
	return (
		<StyledLink href={href} style={{ textDecoration: 'none' }}>
			<Text
				textStyle="primary.xs"
				color="white/60"
				display="inline-block"
				transition="all 0.2s ease"
				_hover={{ color: 'secondaryLight', transform: 'translateX(2px)' }}
			>
				{children}
			</Text>
		</StyledLink>
	)
}

function FooterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
	return (
		<styled.button
			type="button"
			onClick={onClick}
			bg="transparent"
			border="none"
			padding={0}
			cursor="pointer"
			textAlign="left"
			transition="all 0.2s ease"
			_hover={{ transform: 'translateX(2px)' }}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'secondaryLight',
				outlineOffset: '2px',
			}}
		>
			<Text textStyle="primary.xs" color="white/60" _hover={{ color: 'secondaryLight' }}>
				{children}
			</Text>
		</styled.button>
	)
}
