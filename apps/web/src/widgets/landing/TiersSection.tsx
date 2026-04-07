import { Grid, styled, VStack } from '@styled-system/jsx'
import { Check } from 'lucide-react'

const tiers = [
	{
		label: 'Digital Footprint Scan',
		headline: 'Free',
		desc: 'See where your time actually goes. Upload a screenshot or answer a few questions. Get a report showing what to build first.',
		features: [
			'Screen Time screenshot analysis',
			'1 personalized app recommendation',
			'Your data never leaves your browser',
		],
		cta: 'Start free',
		subtext: 'Everyone deserves to know where their time goes.',
		highlighted: false,
	},
	{
		label: 'Build',
		headline: 'EUR 79',
		desc: 'We build your first app for you. Working code, fully set up, delivered in 72 hours. You own everything.',
		features: [
			'Founder builds your app by hand',
			'Working code delivered to your GitHub',
			'You own it. You run it. No lock-in.',
		],
		cta: 'Get it built',
		subtext: 'Costs less than the time you waste on this problem.',
		highlighted: false,
	},
	{
		label: 'Bundle',
		headline: 'EUR 9.99/mo',
		desc: "Access Meldar's growing library of tested automations plus every AI tool your app needs — image, video, voice, search — through one subscription.",
		features: [
			'Full skills library (new automations added weekly)',
			'Bundled AI tools: image gen, video, voice, search',
			'One subscription. One bill. Already set up.',
		],
		cta: 'Start your bundle',
		subtext: 'One bill instead of five.',
		highlighted: true,
	},
]

export function TiersSection() {
	return (
		<styled.section paddingBlock={20} paddingInline={8} bg="surfaceContainerLow">
			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={12}>
				<VStack textAlign="center" gap={4}>
					<styled.h2 textStyle="heading.section" color="onSurface">
						Pick your level
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant" maxWidth="480px">
						Start free. Go deeper when ready.
					</styled.p>
				</VStack>

				<Grid maxWidth="breakpoint-xl" columns={{ base: 1, md: 3 }} gap={8}>
					{tiers.map((tier) => (
						<styled.div
							key={tier.label}
							bg="surfaceContainerLowest"
							padding={10}
							borderRadius="xl"
							display="flex"
							flexDir="column"
							justifyContent="space-between"
							border={tier.highlighted ? '2px solid' : '1px solid'}
							borderColor={tier.highlighted ? 'primary/20' : 'outlineVariant/10'}
							boxShadow={tier.highlighted ? '2xl' : 'none'}
							position="relative"
							transition="box-shadow 0.2s ease"
							_hover={{ boxShadow: 'xl' }}
						>
							{tier.highlighted && (
								<styled.div
									position="absolute"
									top={0}
									right={10}
									transform="translateY(-50%)"
									background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
									paddingInline={4}
									paddingBlock={1}
									borderRadius="full"
									fontSize="2xs"
									color="white"
									textTransform="uppercase"
									letterSpacing="widest"
									fontWeight="700"
								>
									Most popular
								</styled.div>
							)}

							<VStack alignItems="flex-start" gap={0}>
								<styled.span
									textStyle="label.upper"
									fontSize="2xs"
									color={tier.highlighted ? 'primary' : 'onSurface/40'}
								>
									{tier.label}
								</styled.span>
								<styled.h3
									fontFamily="heading"
									fontSize="2xl"
									fontWeight="700"
									marginBlockStart={4}
								>
									{tier.headline}
								</styled.h3>
								<styled.p textStyle="body.sm" color="onSurfaceVariant" marginBlockStart={4}>
									{tier.desc}
								</styled.p>
							</VStack>

							<VStack alignItems="flex-start" gap={4} marginBlockStart={8}>
								{tier.features.map((f) => (
									<styled.div key={f} display="flex" alignItems="center" gap={2}>
										<Check size={16} color="#623153" strokeWidth={2} aria-hidden="true" />
										<styled.span textStyle="body.sm">{f}</styled.span>
									</styled.div>
								))}
							</VStack>

							<styled.a
								href="/start"
								display="block"
								width="100%"
								marginBlockStart={12}
								paddingBlock={3}
								textAlign="center"
								background={
									tier.highlighted
										? 'linear-gradient(135deg, #623153 0%, #FFB876 100%)'
										: 'transparent'
								}
								color={tier.highlighted ? 'white' : 'onSurface'}
								border={tier.highlighted ? 'none' : '1px solid'}
								borderColor="outlineVariant"
								borderRadius="md"
								fontWeight="500"
								textDecoration="none"
								transition="all 0.2s ease"
								_hover={{
									bg: tier.highlighted ? undefined : 'surfaceContainer',
									opacity: tier.highlighted ? 0.9 : 1,
								}}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
							>
								{tier.cta}
							</styled.a>
							{tier.subtext && (
								<styled.p
									textStyle="body.sm"
									color="onSurfaceVariant/50"
									textAlign="center"
									marginBlockStart={3}
									fontStyle="italic"
								>
									{tier.subtext}
								</styled.p>
							)}
						</styled.div>
					))}
				</Grid>
			</VStack>
		</styled.section>
	)
}
