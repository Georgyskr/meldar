import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const problems = [
	{
		number: '001',
		title: 'You hit a wall every time',
		body: 'You heard AI can save you hours. You tried. Then it asked you to install three things and type codes into a black screen. You closed the laptop.',
	},
	{
		number: '002',
		title: 'Even if you got in, then what?',
		body: '"Ask the AI to do something." Great. What? Nobody tells you what to actually do with it for your life.',
	},
	{
		number: '003',
		title: 'Nothing sticks',
		body: 'You tried a tutorial. It worked once. Next day, broken. You tried an app. Used it for a week. Abandoned. Tools that promise to save time waste it.',
	},
]

export function ProblemSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="002" label="A letter to the unbothered" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '3fr 2fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
				>
					<VStack alignItems="flex-start" gap={{ base: 10, md: 14 }}>
						<Heading as="h2" textStyle="primary.xl" color="onSurface">
							Be honest.{' '}
							<Text as="em" textStyle="italic.lg" color="primary">
								This is your week.
							</Text>
						</Heading>

						<VStack gap={0} width="100%" alignItems="stretch">
							{problems.map((p, i) => (
								<ProblemRow key={p.title} {...p} last={i === problems.length - 1} />
							))}
						</VStack>

						<Box
							width="100%"
							paddingBlock={{ base: 6, md: 8 }}
							paddingInline={{ base: 6, md: 8 }}
							borderTop="2px solid"
							borderBottom="1px solid"
							borderColor="onSurface"
							bg="surface"
						>
							<Grid
								gridTemplateColumns={{ base: '1fr', sm: 'auto 1fr' }}
								gap={{ base: 4, sm: 8 }}
								alignItems="baseline"
							>
								<Text textStyle="display.xl" color="primary">
									2,847
								</Text>
								<Box>
									<Text as="p" textStyle="primary.sm" color="onSurface" marginBlockEnd={2}>
										Posts and rants we read across Reddit.
									</Text>
									<Text as="p" textStyle="italic.sm" color="onSurfaceVariant/80">
										— &ldquo;I start tracking it, then I quit because it takes too long.&rdquo; The
										#1 answer, over and over.
									</Text>
								</Box>
							</Grid>
						</Box>
					</VStack>

					<Box display={{ base: 'none', md: 'block' }} position="sticky" top={24}>
						<EditorialPlate
							src="/brand/editorial-plate-02-problem.jpg"
							plateNumber="02"
							caption="The friction."
							aspectRatio="4/5"
						/>
					</Box>
				</Grid>
			</Box>
		</styled.section>
	)
}

function ProblemRow({
	number,
	title,
	body,
	last,
}: {
	number: string
	title: string
	body: string
	last: boolean
}) {
	return (
		<Box
			display="grid"
			gridTemplateColumns={{ base: '48px 1fr', md: '72px 1fr' }}
			gap={{ base: 4, md: 8 }}
			paddingBlock={{ base: 5, md: 7 }}
			borderTop="1px solid"
			borderBottom={last ? '1px solid' : 'none'}
			borderColor="onSurface/15"
			transition="all 0.3s ease"
			_hover={{ bg: 'primary/3' }}
		>
			<Text textStyle="display.sm" color="primary" paddingBlockStart={1}>
				Nº {number}
			</Text>
			<Box>
				<Heading as="h3" textStyle="primary.md" color="onSurface" marginBlockEnd={2}>
					{title}
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant" maxWidth="560px">
					{body}
				</Text>
			</Box>
		</Box>
	)
}
