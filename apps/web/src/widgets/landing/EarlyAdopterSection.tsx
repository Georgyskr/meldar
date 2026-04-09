import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { HandHelping, Mail, Users, Zap } from 'lucide-react'
import { FoundingCounter, FoundingEmailCapture } from '@/features/founding-program'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const perks = [
	{
		number: 'I',
		icon: HandHelping,
		title: '1-on-1 onboarding call',
		subtitle: '15 min, with the founder',
		desc: 'Never touched AI? Perfect. We sit with you (virtually) and walk you through everything. Not a video you watch alone. Actual help, from a real person, until it works.',
	},
	{
		number: 'II',
		icon: Zap,
		title: 'Custom time audit',
		subtitle: 'sent within 48 hours',
		desc: "Tell us what your week looks like. We send you a custom report: here's where your hours go, here's what to automate first, here's how.",
	},
	{
		number: 'III',
		icon: Mail,
		title: 'Weekly letter',
		subtitle: 'one thing you can automate in 10 minutes',
		desc: "Every week, one specific thing you can automate right now with free tools. Practical, not theoretical. You'll start saving time before Meldar even launches.",
	},
	{
		number: 'IV',
		icon: Users,
		title: 'Vote on the next feature',
		subtitle: 'founding members only',
		desc: 'Vote on which features ship first. Your input decides what Meldar becomes. Early members keep this power forever.',
	},
]

export function EarlyAdopterSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto" position="relative">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="009" label="Founding members" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '2fr 3fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
				>
					<Box>
						<Heading as="h2" textStyle="primary.xl" color="onSurface" marginBlockEnd={6}>
							We don&apos;t hand you a tool.
							<br />
							<Text as="em" textStyle="italic.lg" color="primary">
								We walk you in.
							</Text>
						</Heading>
						<Text as="p" textStyle="secondary.lg" color="onSurfaceVariant" maxWidth="420px">
							The real barrier isn&apos;t the tech. Nobody shows you the door. We do.
						</Text>
						<Box display={{ base: 'none', md: 'block' }} marginBlockStart={10}>
							<EditorialPlate
								src="/brand/editorial-plate-07-adopter.jpg"
								plateNumber="07"
								caption="The embrace."
								aspectRatio="5/4"
							/>
						</Box>
					</Box>

					<VStack alignItems="stretch" gap={0}>
						<Box borderTop="2px solid" borderColor="onSurface">
							{perks.map((perk, i) => (
								<PerkRow key={perk.title} {...perk} last={i === perks.length - 1} />
							))}
						</Box>

						<Box
							marginBlockStart={10}
							paddingBlock={{ base: 8, md: 10 }}
							paddingInline={{ base: 6, md: 8 }}
							borderTop="2px solid"
							borderBottom="2px solid"
							borderColor="onSurface"
							bg="surface"
						>
							<VStack gap={6} alignItems="stretch">
								<FoundingCounter />
								<FoundingEmailCapture />
							</VStack>
						</Box>
					</VStack>
				</Grid>
			</Box>
		</styled.section>
	)
}

function PerkRow({
	number,
	icon: Icon,
	title,
	subtitle,
	desc,
	last,
}: {
	number: string
	icon: typeof HandHelping
	title: string
	subtitle: string
	desc: string
	last: boolean
}) {
	return (
		<Box
			paddingBlock={{ base: 6, md: 8 }}
			paddingInline={{ base: 0, md: 0 }}
			borderBottom={last ? 'none' : '1px solid'}
			borderColor="onSurface/15"
			transition="all 0.3s ease"
			_hover={{ bg: 'primary/4' }}
		>
			<Grid
				gridTemplateColumns={{ base: 'auto 1fr', md: '60px 32px 1fr' }}
				gap={{ base: 4, md: 5 }}
				alignItems="start"
			>
				<Text textStyle="display.sm" color="primary">
					§{number}
				</Text>
				<Box paddingBlockStart={{ md: 2 }} display={{ base: 'none', md: 'block' }}>
					<Icon size={22} color="#623153" strokeWidth={1.5} aria-hidden="true" />
				</Box>
				<Box>
					<Heading as="h3" textStyle="primary.md" color="onSurface" marginBlockEnd={1}>
						{title}
					</Heading>
					<Text as="p" textStyle="italic.sm" color="onSurfaceVariant/70" marginBlockEnd={3}>
						— {subtitle}
					</Text>
					<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="560px">
						{desc}
					</Text>
				</Box>
			</Grid>
		</Box>
	)
}
