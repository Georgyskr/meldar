import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { EditorialEyebrow, Heading, Text } from '@/shared/ui'

const rows = [
	{
		feature: 'Starting point',
		meldar: 'Your frustration',
		others: 'A blank prompt',
	},
	{
		feature: 'Technical knowledge',
		meldar: 'None required',
		others: 'Assumed',
	},
	{
		feature: 'Discovers what to automate',
		meldar: 'Yes, from your patterns',
		others: 'You figure it out',
	},
	{
		feature: 'Makes the app for you',
		meldar: 'Yes, while you watch',
		others: 'You do it yourself',
	},
	{
		feature: 'Your data',
		meldar: 'Yours. Always.',
		others: 'Harvested or locked away',
	},
]

export function ComparisonSection() {
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
					<EditorialEyebrow number="003" label="A study in contrast" />
				</Box>

				<Flex
					justifyContent="space-between"
					alignItems="flex-start"
					flexDir={{ base: 'column', md: 'row' }}
					gap={{ base: 8, md: 16 }}
					marginBlockEnd={{ base: 12, md: 16 }}
				>
					<Heading as="h2" textStyle="primary.xl" color="onSurface">
						How this is{' '}
						<Text as="em" textStyle="italic.lg" color="primary">
							different.
						</Text>
					</Heading>
					<Text as="p" textStyle="secondary.lg" color="onSurfaceVariant" maxWidth="420px">
						Five columns, two attitudes. Read either side first.
					</Text>
				</Flex>

				{/* Swiss comparison table */}
				<Box borderTop="2px solid" borderColor="onSurface">
					<Grid
						gridTemplateColumns={{ base: '1fr', md: '3fr 2fr 2fr' }}
						paddingBlock={4}
						borderBottom="1px solid"
						borderColor="onSurface/30"
					>
						<Text textStyle="tertiary.md" color="primary">
							Nº — Feature
						</Text>
						<Text textStyle="tertiary.md" color="primary" display={{ base: 'none', md: 'block' }}>
							Meldar
						</Text>
						<Text
							textStyle="tertiary.md"
							color="onSurface/40"
							display={{ base: 'none', md: 'block' }}
							textAlign="right"
						>
							Everybody else
						</Text>
					</Grid>

					{rows.map((row, i) => (
						<ComparisonRow
							key={row.feature}
							number={String(i + 1).padStart(2, '0')}
							{...row}
							last={i === rows.length - 1}
						/>
					))}
				</Box>
			</Box>
		</styled.section>
	)
}

function ComparisonRow({
	number,
	feature,
	meldar,
	others,
	last,
}: {
	number: string
	feature: string
	meldar: string
	others: string
	last: boolean
}) {
	return (
		<Grid
			gridTemplateColumns={{ base: '1fr', md: '3fr 2fr 2fr' }}
			gap={{ base: 3, md: 6 }}
			paddingBlock={{ base: 6, md: 8 }}
			borderBottom={last ? '2px solid' : '1px solid'}
			borderColor={last ? 'onSurface' : 'onSurface/15'}
			transition="all 0.3s ease"
			_hover={{ bg: 'primary/4' }}
		>
			<Flex alignItems="baseline" gap={4}>
				<Text textStyle="tertiary.md" color="primary">
					Nº {number}
				</Text>
				<Heading as="h3" textStyle="primary.sm" color="onSurface">
					{feature}
				</Heading>
			</Flex>
			<VStack alignItems={{ base: 'flex-start', md: 'flex-start' }} gap={1}>
				<Text textStyle="tertiary.sm" color="primary" display={{ base: 'block', md: 'none' }}>
					— Meldar
				</Text>
				<Text textStyle="primary.sm" color="onSurface">
					{meldar}
				</Text>
			</VStack>
			<VStack alignItems={{ base: 'flex-start', md: 'flex-end' }} gap={1}>
				<Text textStyle="tertiary.sm" color="onSurface/40" display={{ base: 'block', md: 'none' }}>
					— Everybody else
				</Text>
				<Text textStyle="italic.md" color="onSurface/40" textAlign={{ base: 'left', md: 'right' }}>
					{others}
				</Text>
			</VStack>
		</Grid>
	)
}
