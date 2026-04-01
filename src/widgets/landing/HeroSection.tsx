import { Box, Flex, Grid, styled } from '@styled-system/jsx'
import { ArrowRight, Camera, MessageSquare } from 'lucide-react'

export function HeroSection() {
	return (
		<styled.section
			minHeight="calc(100vh - 72px)"
			display="flex"
			flexDir="column"
			justifyContent="center"
			maxWidth="breakpoint-xl"
			marginInline="auto"
			width="100%"
			paddingInline={{ base: 5, md: 12 }}
			paddingBlockStart={8}
			paddingBlockEnd={12}
		>
			<Box maxWidth="720px" marginBlockEnd={12}>
				<styled.h1 textStyle="heading.hero" color="primary" marginBlockEnd={4}>
					Google made ~$238 from
					<styled.br />
					your data last year.
					<styled.br />
					<styled.span color="secondaryLight">What did you get?</styled.span>
				</styled.h1>
				<styled.p
					fontFamily="body"
					fontWeight="300"
					fontSize="xl"
					color="onSurfaceVariant"
					maxWidth="520px"
				>
					Upload a screenshot. See your real numbers. Find out what to build with AI — in 30
					seconds, for free.
				</styled.p>
			</Box>

			<Grid columns={{ base: 1, md: 2 }} gap={4} maxWidth="640px">
				{/* Track A: Show me my data */}
				<styled.a
					href="/start"
					display="flex"
					flexDir="column"
					gap={3}
					padding={6}
					bg="surfaceContainerLowest"
					border="2px solid"
					borderColor="primary/20"
					borderRadius="xl"
					textDecoration="none"
					transition="all 0.2s ease"
					_hover={{ borderColor: 'primary/50', bg: 'primary/3' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<Flex alignItems="center" gap={3}>
						<Flex
							alignItems="center"
							justifyContent="center"
							width="40px"
							height="40px"
							borderRadius="lg"
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						>
							<Camera size={20} color="white" strokeWidth={1.5} />
						</Flex>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="md" color="onSurface">
							Show me my data
						</styled.span>
					</Flex>
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						See your Digital Footprint in 30 seconds
					</styled.span>
					<Flex alignItems="center" gap={1} marginBlockStart="auto">
						<styled.span fontSize="sm" fontWeight="600" color="primary">
							Start here
						</styled.span>
						<ArrowRight size={14} color="#623153" />
					</Flex>
				</styled.a>

				{/* Track B: I know what I need */}
				<styled.a
					href="/start"
					display="flex"
					flexDir="column"
					gap={3}
					padding={6}
					bg="surfaceContainerLowest"
					border="1px solid"
					borderColor="outlineVariant/20"
					borderRadius="xl"
					textDecoration="none"
					transition="all 0.2s ease"
					_hover={{ borderColor: 'outlineVariant/50', bg: 'surface' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<Flex alignItems="center" gap={3}>
						<Flex
							alignItems="center"
							justifyContent="center"
							width="40px"
							height="40px"
							borderRadius="lg"
							bg="surfaceContainerHigh"
						>
							<MessageSquare size={20} color="#623153" strokeWidth={1.5} />
						</Flex>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="md" color="onSurface">
							I know what bugs me
						</styled.span>
					</Flex>
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						Pick your pain points. We&apos;ll show what to fix.
					</styled.span>
					<Flex alignItems="center" gap={1} marginBlockStart="auto">
						<styled.span fontSize="sm" fontWeight="500" color="onSurfaceVariant">
							Take the quiz
						</styled.span>
						<ArrowRight size={14} color="#81737a" />
					</Flex>
				</styled.a>
			</Grid>

			<Flex marginBlockStart={6} alignItems="center" justifyContent="flex-start" gap={3}>
				<styled.div height="1px" width={8} bg="outlineVariant/30" />
				<styled.p
					fontSize="3xs"
					color="outline"
					textTransform="uppercase"
					letterSpacing="0.25em"
					fontWeight="500"
				>
					No signup required &middot; Your screenshot is deleted immediately
				</styled.p>
			</Flex>
		</styled.section>
	)
}
