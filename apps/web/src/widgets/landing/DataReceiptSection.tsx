import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const sampleStats = [
	{ label: 'Google searches', value: '14,283', sub: 'this year' },
	{ label: 'Hours in email', value: '6.2', sub: 'per week' },
	{ label: 'Same recipe search', value: '23x', sub: 'this month' },
	{ label: 'Apps bounced between', value: '47', sub: 'per day' },
	{ label: 'Time recoverable', value: '5.4 hrs', sub: 'per week' },
	{ label: 'Worth to Google', value: '~$238', sub: 'per year in ads' },
]

export function DataReceiptSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="#0f0b0d"
			color="white"
			position="relative"
			overflow="hidden"
		>
			{/* ambient glow */}
			<Box
				position="absolute"
				top="20%"
				right="-10%"
				width="520px"
				height="520px"
				borderRadius="full"
				background="radial-gradient(circle, rgba(255,184,118,0.25) 0%, transparent 70%)"
				filter="blur(80px)"
				pointerEvents="none"
			/>

			<Box maxWidth="breakpoint-xl" marginInline="auto" position="relative">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="005" label="Your data receipt" tone="cream" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '3fr 2fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
				>
					<VStack alignItems="flex-start" gap={{ base: 10, md: 14 }}>
						<Heading as="h2" textStyle="primary.xl" color="white">
							Your data,{' '}
							<Text as="em" textStyle="italic.lg" color="secondaryLight">
								working for you
							</Text>{' '}
							instead of against you.
						</Heading>

						<Text as="p" textStyle="secondary.lg" color="white/70" maxWidth="520px">
							Real numbers from a real report. Google had these and sold you ads. Meldar turns them
							into a list of things to fix.
						</Text>

						{/* Receipt block */}
						<Box
							width="100%"
							maxWidth="540px"
							bg="white"
							color="#1a1a1a"
							position="relative"
							style={{ animation: 'meldarFadeSlideUp 0.8s ease-out 0.3s both' }}
						>
							{/* Torn top edge illusion via border */}
							<Box
								height="4px"
								background="repeating-linear-gradient(90deg, white 0, white 8px, transparent 8px, transparent 16px)"
							/>
							<Box
								paddingBlock={6}
								paddingInline={8}
								borderBottom="1px solid"
								borderColor="#1a1a1a"
							>
								<Flex justifyContent="space-between" alignItems="baseline">
									<Text textStyle="tertiary.md" color="primary">
										Receipt Nº 001
									</Text>
									<Text textStyle="tertiary.sm" color="onSurfaceVariant">
										— est. 2026
									</Text>
								</Flex>
								<Heading as="h3" textStyle="primary.sm" color="#1a1a1a" marginBlockStart={2}>
									Your Time X-Ray
								</Heading>
							</Box>

							<Grid gridTemplateColumns="repeat(2, 1fr)" gap={0}>
								{sampleStats.map((stat, i) => (
									<VStack
										key={stat.label}
										alignItems="flex-start"
										paddingBlock={5}
										paddingInline={6}
										gap={1}
										borderBlockEnd={i < sampleStats.length - 2 ? '1px solid' : 'none'}
										borderInlineEnd={i % 2 === 0 ? '1px solid' : 'none'}
										borderColor="#1a1a1a/15"
									>
										<Text textStyle="display.sm" color="primary">
											{stat.value}
										</Text>
										<Text textStyle="tertiary.sm" color="onSurfaceVariant">
											{stat.label}
										</Text>
										<Text textStyle="italic.sm" color="onSurfaceVariant/60">
											{stat.sub}
										</Text>
									</VStack>
								))}
							</Grid>

							<Flex
								paddingBlock={5}
								paddingInline={8}
								justifyContent="space-between"
								alignItems="baseline"
								borderBlockStart="2px solid"
								borderColor="#1a1a1a"
							>
								<Text textStyle="tertiary.sm" color="onSurfaceVariant">
									meldar.ai · Plate 04
								</Text>
								<Text textStyle="tertiary.md" color="primary">
									Get yours →
								</Text>
							</Flex>
							{/* Torn bottom */}
							<Box
								height="4px"
								background="repeating-linear-gradient(90deg, white 0, white 8px, transparent 8px, transparent 16px)"
							/>
						</Box>

						<Text as="p" textStyle="italic.sm" color="white/50">
							— Sample report. Yours will look different.
						</Text>
					</VStack>

					<Box display={{ base: 'none', md: 'block' }} position="sticky" top={24}>
						<EditorialPlate
							src="/brand/editorial-plate-04-receipt.jpg"
							plateNumber="04"
							caption="The reclaim."
							aspectRatio="4/5"
						/>
					</Box>
				</Grid>
			</Box>
		</styled.section>
	)
}
