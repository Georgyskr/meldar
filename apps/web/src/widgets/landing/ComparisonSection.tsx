import { Box, styled, VStack } from '@styled-system/jsx'

const rows = [
	{ feature: 'Starting point', meldar: 'Your frustration', others: 'A blank prompt' },
	{ feature: 'Technical knowledge', meldar: 'None required', others: 'Assumed' },
	{
		feature: 'Discovers what to automate',
		meldar: 'Yes, from your patterns',
		others: 'You figure it out',
	},
	{
		feature: 'Builds the app for you',
		meldar: 'Yes, while you watch',
		others: 'You build it yourself',
	},
	{ feature: 'Your data', meldar: 'Yours. Always.', others: 'Harvested or locked away' },
]

export function ComparisonSection() {
	return (
		<styled.section
			paddingBlock={20}
			paddingInline={8}
			bg="surface"
			position="relative"
			overflow="hidden"
		>
			<Box
				position="absolute"
				inset={0}
				backgroundImage="url(/images/section-comparison.jpg)"
				backgroundSize="cover"
				backgroundPosition="center"
				opacity={0.1}
			/>
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={8} position="relative" zIndex={1}>
				<styled.h2 textStyle="heading.section" textAlign="center" color="onSurface">
					How this is different
				</styled.h2>

				<styled.div
					width="100%"
					bg="surfaceContainerLowest"
					borderRadius="xl"
					border="1px solid"
					borderColor="outlineVariant/20"
					overflow="hidden"
				>
					{rows.map((r, i) => (
						<styled.div
							key={r.feature}
							display="grid"
							gridTemplateColumns="1fr 1fr 1fr"
							borderBlockEnd={i < rows.length - 1 ? '1px solid' : 'none'}
							borderColor="outlineVariant/15"
							paddingBlock={5}
							paddingInline={6}
							_hover={{ bg: 'surfaceContainerLow' }}
							transition="background 0.15s ease"
						>
							<styled.span textStyle="body.sm" color="onSurfaceVariant" fontWeight="400">
								{r.feature}
							</styled.span>
							<styled.span
								textStyle="body.sm"
								fontWeight="500"
								color="onSurface"
								textAlign="center"
							>
								{r.meldar}
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurface/30" textAlign="right">
								{r.others}
							</styled.span>
						</styled.div>
					))}
				</styled.div>
			</VStack>
		</styled.section>
	)
}
