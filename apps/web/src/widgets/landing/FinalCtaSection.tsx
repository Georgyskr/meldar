import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const StyledLink = styled(Link)

export function FinalCtaSection() {
	return (
		<styled.section
			paddingBlock={{ base: 24, md: 32 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="#0f0b0d"
			color="white"
			position="relative"
			overflow="hidden"
		>
			{/* Ambient glow */}
			<Box
				position="absolute"
				top="0"
				left="50%"
				transform="translateX(-50%)"
				width="900px"
				height="600px"
				borderRadius="full"
				background="radial-gradient(ellipse, rgba(255,184,118,0.2) 0%, transparent 70%)"
				pointerEvents="none"
				style={{ animation: 'gentleBreathe 6s ease-in-out infinite' }}
			/>

			<Box maxWidth="breakpoint-xl" marginInline="auto" position="relative">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="011" label="The last word" tone="cream" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '3fr 2fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="center"
				>
					<VStack alignItems="flex-start" gap={{ base: 10, md: 14 }}>
						<Heading as="h2" textStyle="primary.xxl" color="white">
							The people who learn AI now
							<br />
							<Text as="em" textStyle="italic.lg" color="secondaryLight">
								won&apos;t be replaced.
							</Text>
						</Heading>

						<Text as="p" textStyle="secondary.xl" color="white/70" maxWidth="520px">
							No code. No experience needed. Just show up and start doing.
						</Text>

						<Flex
							alignItems="center"
							gap={6}
							flexDir={{ base: 'column', sm: 'row' }}
							style={{ animation: 'meldarFadeSlideUp 0.8s ease-out 0.3s both' }}
						>
							<StyledLink
								href="/sign-up"
								display="inline-flex"
								alignItems="center"
								gap={3}
								paddingInline={10}
								paddingBlock={5}
								bg="white"
								color="onSurface"
								textDecoration="none"
								borderRadius="2px"
								transition="all 0.3s ease"
								boxShadow="0 12px 40px rgba(255, 184, 118, 0.3)"
								_hover={{
									bg: 'secondaryLight',
									transform: 'translateY(-2px)',
									boxShadow: '0 16px 48px rgba(255, 184, 118, 0.45)',
								}}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'secondaryLight',
									outlineOffset: '3px',
								}}
							>
								<Text as="span" textStyle="button.lg" color="onSurface">
									Start free
								</Text>
								<ArrowRight size={20} />
							</StyledLink>
							<Text textStyle="italic.md" color="white/60">
								— no credit card, nobody watching
							</Text>
						</Flex>

						{/* Colophon line */}
						<Box
							width="100%"
							maxWidth="520px"
							paddingBlockStart={8}
							borderTop="1px solid"
							borderColor="white/20"
						>
							<Flex justifyContent="space-between" flexWrap="wrap" gap={3}>
								<Text textStyle="tertiary.sm" color="white/40">
									— End of issue Nº 001
								</Text>
								<Text textStyle="tertiary.sm" color="white/40">
									Vol. I · The AI issue
								</Text>
							</Flex>
						</Box>
					</VStack>

					<Box display={{ base: 'none', md: 'block' }}>
						<EditorialPlate
							src="/brand/editorial-plate-08-final.jpg"
							plateNumber="08"
							caption="The horizon."
							aspectRatio="3/4"
						/>
					</Box>
				</Grid>
			</Box>
		</styled.section>
	)
}
