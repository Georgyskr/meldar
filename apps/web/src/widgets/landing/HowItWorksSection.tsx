import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const steps = [
	{
		num: '01',
		title: 'Take back your data',
		desc: 'We show you how to download what Google, Apple, and Meta know about you. Takes 3 minutes. It\u2019s your legal right.',
	},
	{
		num: '02',
		title: 'See your real numbers',
		desc: 'Drop the file in. It never leaves your device. You see which apps eat your hours, where your week actually goes.',
	},
	{
		num: '03',
		title: 'Pick a fix. We make it.',
		desc: 'Your analysis ranks the biggest time sinks and what to make to fix each one. Pick one. Watch it come to life.',
	},
]

export function HowItWorksSection() {
	return (
		<styled.section
			id="how-it-works"
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surfaceContainerLow"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="004" label="How it actually works" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '2fr 3fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
				>
					<Box>
						<Heading as="h2" textStyle="primary.xl" color="onSurface" marginBlockEnd={8}>
							No installs.
							<br />
							No permissions.
							<br />
							<Text as="em" textStyle="italic.lg" color="primary">
								Just a file you already own.
							</Text>
						</Heading>
						<Box display={{ base: 'none', md: 'block' }}>
							<EditorialPlate
								src="/brand/editorial-plate-03-howitworks.jpg"
								plateNumber="03"
								caption="The ascent."
								aspectRatio="4/5"
							/>
						</Box>
					</Box>

					<VStack alignItems="stretch" gap={0}>
						{steps.map((step, i) => (
							<StepRow key={step.num} {...step} last={i === steps.length - 1} />
						))}
					</VStack>
				</Grid>
			</Box>
		</styled.section>
	)
}

function StepRow({
	num,
	title,
	desc,
	last,
}: {
	num: string
	title: string
	desc: string
	last: boolean
}) {
	return (
		<Box
			position="relative"
			paddingBlock={{ base: 7, md: 10 }}
			borderTop="2px solid"
			borderBottom={last ? '2px solid' : 'none'}
			borderColor="onSurface"
			transition="all 0.35s ease"
			_hover={{
				paddingInlineStart: { md: 4 },
				bg: 'primary/4',
			}}
		>
			<Grid
				gridTemplateColumns={{ base: 'auto 1fr', md: '100px 1fr' }}
				gap={{ base: 5, md: 8 }}
				alignItems="start"
			>
				<Box>
					<Text textStyle="display.lg" color="primary" display="block">
						{num}
					</Text>
					<Text textStyle="tertiary.md" color="primary/60" display="block" marginBlockStart={1}>
						Chapter
					</Text>
				</Box>
				<Box>
					<Heading as="h3" textStyle="primary.lg" color="onSurface" marginBlockEnd={3}>
						{title}
					</Heading>
					<Text as="p" textStyle="secondary.md" color="onSurfaceVariant" maxWidth="560px">
						{desc}
					</Text>
				</Box>
			</Grid>
		</Box>
	)
}
