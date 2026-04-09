import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const StyledLink = styled(Link)

export function HeroSection() {
	return (
		<styled.section
			position="relative"
			overflow="hidden"
			bg="surface"
			minHeight="100dvh"
			display="flex"
			flexDirection="column"
			justifyContent="center"
		>
			<Box
				maxWidth="breakpoint-xl"
				marginInline="auto"
				paddingInline={{ base: 5, md: 12 }}
				paddingBlockStart={{ base: 20, md: 20 }}
				width="100%"
			>
				<Box
					height="2px"
					bg="onSurface"
					transformOrigin="left center"
					style={{ animation: 'ruleDraw 0.8s ease-out 0.1s both' }}
				/>
				<Flex
					justifyContent="space-between"
					alignItems="baseline"
					paddingBlock={3}
					borderBottom="1px solid"
					borderColor="onSurface"
				>
					<Text
						textStyle="tertiary.md"
						color="onSurface"
						style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.3s both' }}
					>
						Vol. I · The AI issue · Free forever
					</Text>
					<Text
						textStyle="tertiary.md"
						color="onSurface/60"
						display={{ base: 'none', md: 'inline' }}
						style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.4s both' }}
					>
						2,847 readers this week
					</Text>
				</Flex>
			</Box>

			<Grid
				position="relative"
				maxWidth="breakpoint-xl"
				marginInline="auto"
				paddingInline={{ base: 5, md: 12 }}
				paddingBlockStart={{ base: 8, md: 10 }}
				paddingBlockEnd={{ base: 8, md: 10 }}
				gridTemplateColumns={{ base: '1fr', md: '3fr 2fr' }}
				gap={{ base: 12, md: 16 }}
				alignItems="start"
			>
				<VStack alignItems="flex-start" gap={{ base: 8, md: 10 }}>
					<Box style={{ animation: 'meldarFadeSlideUp 0.7s ease-out 0.5s both' }}>
						<EditorialEyebrow number="001" label="Learn AI by Doing" />
					</Box>

					<Box>
						<Heading
							as="h1"
							textStyle="primary.xxl"
							color="onSurface"
							marginBlockEnd={6}
							style={{ animation: 'meldarFadeSlideUp 0.8s ease-out 0.6s both' }}
						>
							The world runs
							<Text as="span" display={{ base: 'none', md: 'inline' }}>
								{' '}
							</Text>
							<Text as="span" display={{ base: 'inline', md: 'none' }}>
								<br />
							</Text>
							on AI now.
							<br />
							<Text as="span" color="primary">
								Your first app
							</Text>
							<br />
							<Text
								as="span"
								color="onSurface"
								display="inline-block"
								position="relative"
								style={{
									backgroundImage: 'linear-gradient(to right, #FFB876 0, #FFB876 100%)',
									backgroundSize: '100% 14px',
									backgroundPosition: '0 92%',
									backgroundRepeat: 'no-repeat',
									animation: 'peachUnderlineDraw 0.8s ease-out 1.1s both',
								}}
							>
								starts here.
							</Text>
						</Heading>
						<Text
							as="p"
							textStyle="secondary.lg"
							color="onSurfaceVariant"
							maxWidth="520px"
							style={{ animation: 'meldarFadeSlideUp 0.7s ease-out 0.9s both' }}
						>
							You don&apos;t need to become technical. Meldar teaches you AI{' '}
							<Text as="em" textStyle="italic.md" color="onSurface">
								by doing
							</Text>{' '}
							— pick a project, watch it come to life, learn what happened along the way.
						</Text>
					</Box>

					<Grid
						gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }}
						gap={{ base: 4, md: 6 }}
						width="100%"
						maxWidth="560px"
						style={{ animation: 'meldarFadeSlideUp 0.7s ease-out 1.05s both' }}
					>
						<Chapter
							number="01"
							label="Pick it"
							desc="Choose a project or describe what you need."
						/>
						<Chapter
							number="02"
							label="Watch it"
							desc="AI makes it while you see what's happening."
						/>
						<Chapter number="03" label="Own it" desc="Deploy it. It's yours. No lock-in." />
					</Grid>

					<Flex
						gap={6}
						flexDir={{ base: 'column', sm: 'row' }}
						alignItems={{ base: 'stretch', sm: 'center' }}
						style={{ animation: 'meldarFadeSlideUp 0.7s ease-out 1.2s both' }}
					>
						<StyledLink
							href="/sign-up"
							display="inline-flex"
							alignItems="center"
							justifyContent="center"
							gap={3}
							paddingInline={8}
							paddingBlock={4}
							bg="onSurface"
							color="surface"
							textDecoration="none"
							borderRadius="2px"
							textStyle="button.lg"
							transition="all 0.2s ease"
							_hover={{
								bg: 'primary',
								transform: 'translateY(-1px)',
							}}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '3px',
							}}
						>
							<Text as="span" textStyle="button.lg" color="surface">
								Start free
							</Text>
							<ArrowRight size={18} />
						</StyledLink>
						<styled.a
							href="#how-it-works"
							display="inline-flex"
							alignItems="center"
							textDecoration="none"
							paddingBlockEnd={1}
							borderBottom="1.5px solid"
							borderColor="onSurface"
							transition="all 0.2s ease"
							_hover={{ borderColor: 'primary' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '3px',
							}}
						>
							<Text textStyle="button.sm" color="onSurface">
								How is this different from a course?
							</Text>
						</styled.a>
					</Flex>

					<Box
						paddingBlockStart={4}
						borderTop="1px solid"
						borderColor="outlineVariant/40"
						width="100%"
						maxWidth="520px"
						style={{ animation: 'meldarFadeSlideUp 0.7s ease-out 1.35s both' }}
					>
						<Text as="p" textStyle="italic.md" color="onSurfaceVariant/80">
							— AI is easy. You just haven&apos;t tried it the right way, until now.
						</Text>
					</Box>
				</VStack>

				<Box
					style={{ animation: 'plateFadeIn 1.2s ease-out 0.7s both' }}
					display={{ base: 'none', md: 'block' }}
					position="sticky"
					top={8}
				>
					<EditorialPlate
						src="/brand/editorial-plate-01.jpg"
						plateNumber="01"
						caption="The invitation."
						aspectRatio="3/4"
						priority
					/>
				</Box>
			</Grid>
		</styled.section>
	)
}

function Chapter({ number, label, desc }: { number: string; label: string; desc: string }) {
	return (
		<Box
			paddingBlockStart={3}
			borderTop="2px solid"
			borderColor="onSurface"
			transition="all 0.25s ease"
			_hover={{ borderColor: 'primary' }}
		>
			<Text textStyle="tertiary.md" color="primary" display="block" marginBlockEnd={2}>
				Nº {number}
			</Text>
			<Heading as="h3" textStyle="primary.sm" color="onSurface" display="block" marginBlockEnd={1}>
				{label}
			</Heading>
			<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/70">
				{desc}
			</Text>
		</Box>
	)
}
