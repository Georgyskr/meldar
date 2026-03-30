import { Grid, styled, VStack } from '@styled-system/jsx'
import { Check } from 'lucide-react'

const tiers = [
	{
		label: 'Time X-Ray',
		headline: 'Free',
		desc: 'See where your time actually goes. Upload your data or just answer a few questions. Either way, you get a report that shows what\u2019s eating your hours.',
		features: [
			'Answer a quick quiz or upload your data',
			'Screen Time screenshot analysis',
			'Shareable Data Receipt with your real numbers',
		],
		cta: 'Get your free X-Ray',
		highlighted: false,
	},
	{
		label: 'Starter',
		headline: 'Pay as you go',
		desc: 'We set everything up and build your first automation. Hand by hand. You pay only for what you use.',
		features: [
			'Guided setup \u2014 we walk you through it',
			'Deeper data analysis from Google Takeout',
			'Your first personal app, built for you',
		],
		cta: 'Join the waitlist',
		highlighted: true,
	},
	{
		label: 'Concierge',
		headline: 'We handle it',
		desc: 'Tell us what you need. Our AI designs it, builds it, and hands it to you. You watch the progress live.',
		features: [
			'Real-time build progress',
			'Pick your favorite design',
			'You own everything we create',
		],
		cta: 'Join the waitlist',
		highlighted: false,
	},
]

export function TiersSection() {
	return (
		<styled.section paddingBlock={32} paddingInline={8} bg="surfaceContainerLow">
			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={12}>
				<VStack textAlign="center" gap={4}>
					<styled.h2 textStyle="heading.section" color="onSurface">
						Pick how deep you want to go
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant" maxWidth="480px">
						Start with the free X-Ray. Go further when you\u2019re ready.
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
									Best starting point
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
								href="/quiz"
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
						</styled.div>
					))}
				</Grid>
			</VStack>
		</styled.section>
	)
}
