import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
	return (
		<styled.section position="relative" overflow="hidden">
			{/* Background: topography image with overlay */}
			<Box
				position="absolute"
				inset={0}
				backgroundImage="url(/images/hero-bg.jpg)"
				backgroundSize="cover"
				backgroundPosition="center"
				opacity={0.35}
				style={{ filter: 'saturate(1.5)' }}
			/>
			<Box
				position="absolute"
				inset={0}
				background="linear-gradient(180deg, rgba(250,249,246,0.6) 0%, rgba(250,249,246,0.75) 50%, #faf9f6 100%)"
			/>

			<VStack
				position="relative"
				zIndex={1}
				maxWidth="breakpoint-xl"
				marginInline="auto"
				width="100%"
				paddingInline={{ base: 5, md: 12 }}
				paddingBlockStart={{ base: 28, md: 36 }}
				paddingBlockEnd={{ base: 16, md: 20 }}
				gap={{ base: 10, md: 14 }}
				alignItems="flex-start"
			>
				{/* Main copy */}
				<Box maxWidth="680px">
					<styled.h1
						fontFamily="heading"
						fontSize={{ base: '3xl', md: '5xl' }}
						fontWeight="800"
						lineHeight="1.1"
						letterSpacing="-0.03em"
						color="onSurface"
						marginBlockEnd={5}
						style={{ animation: 'meldarFadeSlideUp 0.6s ease-out both' }}
					>
						AI is eating the world.
						<styled.br />
						Your data fed it.
						<styled.br />
						<styled.span
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
							backgroundClip="text"
							color="transparent"
						>
							Time to get something back.
						</styled.span>
					</styled.h1>
					<styled.p
						fontFamily="body"
						fontWeight="300"
						fontSize={{ base: 'md', md: 'xl' }}
						color="onSurfaceVariant"
						maxWidth="560px"
						lineHeight="1.6"
						style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.15s both' }}
					>
						Google made ~$238 from your data last year. You got nothing. We take that same data,
						show you what it means, and help you build with AI before everyone else does.
					</styled.p>
				</Box>

				{/* 3 steps */}
				<Flex
					gap={{ base: 4, md: 8 }}
					flexDir={{ base: 'column', md: 'row' }}
					width="100%"
					maxWidth="680px"
					style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.3s both' }}
				>
					<StepChip
						number="1"
						label="See it"
						desc="Upload a screenshot. See where your time goes."
					/>
					<StepChip
						number="2"
						label="Get it"
						desc="Your report shows what to fix and what to build."
					/>
					<StepChip number="3" label="Build it" desc="We teach you how. Or we build it for you." />
				</Flex>

				{/* CTA */}
				<Flex
					gap={4}
					flexDir={{ base: 'column', sm: 'row' }}
					alignItems={{ base: 'stretch', sm: 'center' }}
					style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.45s both' }}
				>
					<styled.a
						href="/start"
						display="inline-flex"
						alignItems="center"
						justifyContent="center"
						gap={2}
						paddingInline={7}
						paddingBlock={4}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						fontFamily="heading"
						fontWeight="700"
						fontSize="md"
						borderRadius="md"
						textDecoration="none"
						transition="all 0.2s ease"
						boxShadow="0 4px 16px rgba(98, 49, 83, 0.25)"
						_hover={{
							boxShadow: '0 6px 24px rgba(98, 49, 83, 0.35)',
							transform: 'translateY(-1px)',
						}}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						Show me my data
						<ArrowRight size={18} />
					</styled.a>
					<styled.a
						href="/start"
						display="inline-flex"
						alignItems="center"
						justifyContent="center"
						paddingInline={7}
						paddingBlock={4}
						bg="transparent"
						color="onSurface"
						fontFamily="heading"
						fontWeight="600"
						fontSize="md"
						borderRadius="md"
						border="1.5px solid"
						borderColor="outlineVariant/30"
						textDecoration="none"
						transition="all 0.2s ease"
						_hover={{ borderColor: 'primary/40', bg: 'primary/3' }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						I already know what bugs me
					</styled.a>
				</Flex>

				{/* Trust line */}
				<styled.p
					fontSize="2xs"
					color="onSurfaceVariant/40"
					textTransform="uppercase"
					letterSpacing="0.2em"
					fontWeight="500"
					style={{ animation: 'meldarFadeSlideUp 0.6s ease-out 0.6s both' }}
				>
					Find out what you should've built six months ago.
				</styled.p>
			</VStack>
		</styled.section>
	)
}

function StepChip({ number, label, desc }: { number: string; label: string; desc: string }) {
	return (
		<Flex gap={3} alignItems="flex-start" flex={1}>
			<styled.span
				fontFamily="heading"
				fontWeight="800"
				fontSize="2xl"
				lineHeight="1"
				color="primary/35"
				flexShrink={0}
			>
				{number}
			</styled.span>
			<Box>
				<styled.span
					fontFamily="heading"
					fontWeight="700"
					fontSize="sm"
					color="onSurface"
					display="block"
				>
					{label}
				</styled.span>
				<styled.span fontSize="xs" color="onSurfaceVariant/60" lineHeight="1.5">
					{desc}
				</styled.span>
			</Box>
		</Flex>
	)
}
