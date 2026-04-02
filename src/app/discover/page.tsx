import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Brain, Camera, Moon } from 'lucide-react'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'

export const metadata: Metadata = {
	title: `What's Eating Your Week? | ${SITE_CONFIG.name}`,
	description: 'Discover where your time actually goes. Free tools that show you what to fix.',
	alternates: { canonical: `${SITE_CONFIG.url}/discover` },
}

const tools = [
	{
		icon: Camera,
		title: 'Digital Footprint Scan',
		desc: 'Upload a Screen Time screenshot. See your real numbers.',
		time: '30 seconds',
		href: '/xray',
		gradient: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
		primary: true,
	},
	{
		icon: Brain,
		title: 'The Overthink Report',
		desc: '8 questions about your daily decisions. See how much time you lose to indecision.',
		time: '2 minutes',
		href: '/discover/overthink',
		gradient: 'linear-gradient(135deg, #4a5568 0%, #a0aec0 100%)',
		primary: false,
	},
	{
		icon: Moon,
		title: 'Sleep Debt Score',
		desc: '5 questions about your bedtime habits. See how much sleep your phone steals.',
		time: '1 minute',
		href: '/discover/sleep',
		gradient: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
		primary: false,
	},
]

export default function DiscoverPage() {
	return (
		<styled.main paddingBlockStart="120px" paddingBlockEnd={32} paddingInline={{ base: 5, md: 12 }}>
			<VStack maxWidth="breakpoint-lg" marginInline="auto" gap={12}>
				{/* Header */}
				<VStack gap={3} textAlign="center" maxWidth="600px">
					<styled.h1
						fontFamily="heading"
						fontSize={{ base: '3xl', md: '5xl' }}
						fontWeight="700"
						color="primary"
						letterSpacing="-0.04em"
						lineHeight="0.95"
					>
						What&apos;s eating
						<styled.br />
						your week?
					</styled.h1>
					<styled.p fontFamily="body" fontWeight="300" fontSize="lg" color="onSurfaceVariant">
						Free tools that show you where your time actually goes.
						<styled.br />
						Pick one. Takes under 2 minutes.
					</styled.p>
				</VStack>

				{/* Tool cards */}
				<Grid columns={{ base: 1, md: 3 }} gap={4} width="100%">
					{tools.map((tool) => (
						<styled.a
							key={tool.title}
							href={tool.href}
							display="flex"
							flexDir="column"
							gap={4}
							padding={6}
							bg="surfaceContainerLowest"
							border={tool.primary ? '2px solid' : '1px solid'}
							borderColor={tool.primary ? 'primary/20' : 'outlineVariant/15'}
							borderRadius="xl"
							textDecoration="none"
							transition="all 0.2s ease"
							position="relative"
							overflow="hidden"
							_hover={{
								borderColor: tool.primary ? 'primary/50' : 'outlineVariant/40',
								transform: 'translateY(-2px)',
								boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
							}}
						>
							{/* Gradient accent bar */}
							<Box
								position="absolute"
								top={0}
								left={0}
								right={0}
								height="3px"
								background={tool.gradient}
							/>

							<Flex alignItems="center" gap={3}>
								<Flex
									alignItems="center"
									justifyContent="center"
									width="44px"
									height="44px"
									borderRadius="lg"
									background={tool.gradient}
								>
									<tool.icon size={22} color="white" strokeWidth={1.5} />
								</Flex>
								<VStack gap={0} alignItems="flex-start">
									<styled.span
										fontFamily="heading"
										fontWeight="700"
										fontSize="md"
										color="onSurface"
									>
										{tool.title}
									</styled.span>
									<styled.span fontSize="xs" color="onSurfaceVariant/60">
										{tool.time}
									</styled.span>
								</VStack>
							</Flex>

							<styled.p textStyle="body.sm" color="onSurfaceVariant" flex={1}>
								{tool.desc}
							</styled.p>

							<Flex alignItems="center" gap={1}>
								<styled.span
									fontSize="sm"
									fontWeight="600"
									color={tool.primary ? 'primary' : 'onSurfaceVariant'}
								>
									{tool.primary ? 'Start here' : 'Try it'}
								</styled.span>
								<ArrowRight size={14} color={tool.primary ? '#623153' : '#81737a'} />
							</Flex>
						</styled.a>
					))}
				</Grid>

				{/* Trust line */}
				<Flex alignItems="center" justifyContent="center" gap={3}>
					<styled.div height="1px" width={8} bg="outlineVariant/30" />
					<styled.p
						fontSize="3xs"
						color="outline"
						textTransform="uppercase"
						letterSpacing="0.25em"
						fontWeight="500"
					>
						No signup &middot; No install &middot; Results in seconds
					</styled.p>
					<styled.div height="1px" width={8} bg="outlineVariant/30" />
				</Flex>
			</VStack>
		</styled.main>
	)
}
