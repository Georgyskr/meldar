import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'

const sampleStats = [
	{ label: 'Google searches', value: '14,283', sub: 'this year' },
	{ label: 'Hours in email', value: '6.2', sub: 'per week' },
	{ label: 'Same recipe search', value: '23x', sub: 'this month' },
	{ label: 'Apps bounced between', value: '47', sub: 'per day' },
	{ label: 'Time recoverable', value: '5.4 hrs', sub: 'per week' },
	{ label: 'Your data worth to Google', value: '~$238', sub: 'per year in ads' },
]

export function DataReceiptSection() {
	return (
		<styled.section paddingBlock={32} paddingInline={8} bg="surface">
			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={12}>
				<VStack textAlign="center" gap={4} maxWidth="600px" marginInline="auto">
					<styled.span textStyle="label.upper" color="primary">
						Your Time X-Ray
					</styled.span>
					<styled.h2 textStyle="heading.section" color="onSurface">
						This is what your data looks like when it works for you
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant">
						A real report from real data. Google had these numbers. They used them to sell you ads.
						You can use them to get your life back.
					</styled.p>
				</VStack>

				{/* Data Receipt Card — the shareable artifact */}
				<Box
					maxWidth="440px"
					marginInline="auto"
					bg="surfaceContainerLowest"
					borderRadius="xl"
					border="1px solid"
					borderColor="outlineVariant/20"
					overflow="hidden"
					boxShadow="0 24px 48px rgba(0,0,0,0.08)"
				>
					{/* Header gradient strip */}
					<Box
						paddingBlock={6}
						paddingInline={8}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						textAlign="center"
					>
						<styled.p fontFamily="heading" fontWeight="700" fontSize="lg">
							Your Data Receipt
						</styled.p>
						<styled.p fontSize="xs" opacity={0.8} marginBlockStart={1}>
							Powered by your Google Takeout
						</styled.p>
					</Box>

					{/* Stats grid */}
					<Grid columns={2} gap={0}>
						{sampleStats.map((stat, i) => (
							<VStack
								key={stat.label}
								padding={6}
								gap={1}
								borderBlockEnd={i < sampleStats.length - 2 ? '1px solid' : 'none'}
								borderColor="outlineVariant/10"
								borderInlineEnd={i % 2 === 0 ? '1px solid' : 'none'}
							>
								<styled.span fontFamily="heading" fontSize="2xl" fontWeight="800" color="primary">
									{stat.value}
								</styled.span>
								<styled.span fontSize="xs" color="onSurfaceVariant" textAlign="center">
									{stat.label}
								</styled.span>
								<styled.span fontSize="2xs" color="onSurface/30">
									{stat.sub}
								</styled.span>
							</VStack>
						))}
					</Grid>

					{/* Footer */}
					<Flex
						paddingBlock={4}
						paddingInline={8}
						justifyContent="space-between"
						alignItems="center"
						borderBlockStart="1px solid"
						borderColor="outlineVariant/10"
					>
						<styled.span fontSize="2xs" color="onSurface/30">
							meldar.ai
						</styled.span>
						<styled.span fontSize="2xs" color="primary" fontWeight="500">
							Get your own X-Ray &rarr;
						</styled.span>
					</Flex>
				</Box>

				<styled.p
					textStyle="body.sm"
					color="onSurfaceVariant"
					textAlign="center"
					fontStyle="italic"
				>
					Sample report. Your numbers will be different &mdash; and probably more surprising.
				</styled.p>
			</VStack>
		</styled.section>
	)
}
