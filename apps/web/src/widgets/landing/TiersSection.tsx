import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { EditorialEyebrow, Heading, Text } from '@/shared/ui'

const StyledLink = styled(Link)

const tiers = [
	{
		number: 'I',
		label: 'Time X-Ray',
		price: 'Free',
		priceSuffix: '',
		desc: 'See where your time actually goes. Upload a screenshot or answer a few questions. Get a report showing what to fix first.',
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
		number: 'II',
		label: 'Starter',
		price: 'EUR 9.99',
		priceSuffix: '/month',
		desc: "Meldar's growing library of tested automations plus every AI tool your app needs — image, video, voice, search — through one subscription.",
		features: [
			'Full skills library (new automations weekly)',
			'Bundled AI tools: image, video, voice, search',
			'One subscription, one bill, already set up',
		],
		cta: 'Start your bundle',
		subtext: 'One bill instead of five.',
		highlighted: true,
	},
	{
		number: 'III',
		label: 'Concierge',
		price: 'EUR 79',
		priceSuffix: '',
		desc: 'We hand-make your first app for you. Working code, fully set up, delivered in 72 hours. You own everything.',
		features: [
			'Founder crafts your app by hand',
			'Working code delivered to your GitHub',
			'You own it. You run it. No lock-in.',
		],
		cta: 'Get it made',
		subtext: 'Costs less than the time you waste on this problem.',
		highlighted: false,
	},
]

export function TiersSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surfaceContainerLow"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="008" label="Pick your level" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '2fr 3fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
					marginBlockEnd={{ base: 12, md: 16 }}
				>
					<Heading as="h2" textStyle="primary.xl" color="onSurface">
						Start free.
						<br />
						<Text as="em" textStyle="italic.lg" color="primary">
							Go deeper when ready.
						</Text>
					</Heading>
					<Text as="p" textStyle="secondary.lg" color="onSurfaceVariant" maxWidth="520px">
						Three tiers, three temperaments. Scan what wastes your time for free, then graduate when
						you want more.
					</Text>
				</Grid>

				<Box borderTop="2px solid" borderColor="onSurface">
					<Grid gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}>
						{tiers.map((tier, i) => (
							<TierColumn key={tier.label} {...tier} last={i === tiers.length - 1} />
						))}
					</Grid>
				</Box>
			</Box>
		</styled.section>
	)
}

function TierColumn({
	number,
	label,
	price,
	priceSuffix,
	desc,
	features,
	cta,
	subtext,
	highlighted,
	last,
}: {
	number: string
	label: string
	price: string
	priceSuffix: string
	desc: string
	features: string[]
	cta: string
	subtext: string
	highlighted: boolean
	last: boolean
}) {
	return (
		<Flex
			flexDir="column"
			justifyContent="space-between"
			paddingBlock={{ base: 8, md: 10 }}
			paddingInline={{ base: 5, md: 7 }}
			borderBottom={{ base: '1px solid', md: '2px solid' }}
			borderInlineEnd={{ base: 'none', md: last ? 'none' : '1px solid' }}
			borderColor={{ base: 'onSurface/20', md: 'onSurface' }}
			bg={highlighted ? 'primary/4' : 'transparent'}
			position="relative"
			transition="all 0.3s ease"
			_hover={{ bg: highlighted ? 'primary/6' : 'primary/3' }}
		>
			{highlighted && (
				<Box
					position="absolute"
					top="-2px"
					left={0}
					right={0}
					height="6px"
					bg="primary"
					style={{ transformOrigin: 'left', animation: 'ruleDraw 0.8s ease-out 0.2s both' }}
				/>
			)}

			<Box>
				<Flex justifyContent="space-between" alignItems="baseline" marginBlockEnd={8}>
					<Text textStyle="tertiary.md" color="primary">
						Tier §{number}
					</Text>
					{highlighted && (
						<Text textStyle="tertiary.sm" color="primary">
							· most popular
						</Text>
					)}
				</Flex>

				<Heading as="h3" textStyle="primary.md" color="onSurface" marginBlockEnd={3}>
					{label}
				</Heading>

				<Flex alignItems="baseline" gap={1} marginBlockEnd={6}>
					<Text textStyle="display.md" color="primary">
						{price}
					</Text>
					{priceSuffix && (
						<Text textStyle="italic.sm" color="onSurfaceVariant">
							{priceSuffix}
						</Text>
					)}
				</Flex>

				<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" marginBlockEnd={8}>
					{desc}
				</Text>

				<VStack alignItems="flex-start" gap={3} marginBlockEnd={10}>
					{features.map((f) => (
						<Flex key={f} alignItems="flex-start" gap={3}>
							<Box marginBlockStart={1}>
								<Check size={14} color="#623153" strokeWidth={2} aria-hidden="true" />
							</Box>
							<Text textStyle="secondary.sm" color="onSurface">
								{f}
							</Text>
						</Flex>
					))}
				</VStack>
			</Box>

			<VStack alignItems="stretch" gap={3}>
				<StyledLink
					href="/sign-up"
					display="inline-flex"
					alignItems="center"
					justifyContent="center"
					gap={2}
					paddingBlock={4}
					bg={highlighted ? 'onSurface' : 'transparent'}
					color={highlighted ? 'surface' : 'onSurface'}
					border={highlighted ? 'none' : '1.5px solid'}
					borderColor="onSurface"
					textDecoration="none"
					transition="all 0.2s ease"
					_hover={{
						bg: highlighted ? 'primary' : 'onSurface',
						color: 'surface',
					}}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '3px',
					}}
				>
					<Text
						textStyle="button.sm"
						color={highlighted ? 'surface' : 'onSurface'}
						_hover={{ color: 'surface' }}
					>
						{cta}
					</Text>
					<ArrowRight size={14} />
				</StyledLink>
				<Text as="p" textStyle="italic.sm" color="onSurfaceVariant/60" textAlign="center">
					— {subtext}
				</Text>
			</VStack>
		</Flex>
	)
}
