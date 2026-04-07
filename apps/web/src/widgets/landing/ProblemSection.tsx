import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { Ban, HelpCircle, RotateCcw } from 'lucide-react'

const problems = [
	{
		icon: Ban,
		title: 'You hit a wall every time',
		body: 'You heard AI can save you hours. You tried. Then it asked you to install three things and type codes into a black screen. You closed the laptop.',
	},
	{
		icon: HelpCircle,
		title: 'Even if you got in, then what?',
		body: 'Let\'s say you got it working. Now what? "Ask the AI to do something." Great. What? Nobody tells you what to actually do with it for your life.',
	},
	{
		icon: RotateCcw,
		title: 'Nothing sticks',
		body: 'You tried a tutorial. It worked once. Next day, broken. You tried an app. Used it for a week. Abandoned. Tools that promise to save time waste it.',
	},
]

export function ProblemSection() {
	return (
		<styled.section
			paddingBlock={20}
			paddingInline={8}
			bg="surfaceContainerLow"
			position="relative"
			overflow="hidden"
		>
			<Box
				position="absolute"
				right={0}
				top={0}
				width="50%"
				height="100%"
				backgroundImage="url(/images/section-problem.jpg)"
				backgroundSize="cover"
				backgroundPosition="center"
				opacity={0.06}
				display={{ base: 'none', md: 'block' }}
			/>
			<Grid
				maxWidth="breakpoint-xl"
				marginInline="auto"
				columns={{ base: 1, md: 2 }}
				gap={24}
				alignItems="center"
			>
				<VStack alignItems="flex-start" gap={12}>
					<styled.h2 textStyle="heading.section" color="onSurface">
						Be honest. This is your week.
					</styled.h2>
					<VStack gap={8}>
						{problems.map((p) => (
							<styled.div key={p.title} display="flex" gap={6} alignItems="flex-start">
								<styled.div flexShrink={0} marginBlockStart={1}>
									<p.icon size={24} color="#623153" strokeWidth={1.5} aria-hidden="true" />
								</styled.div>
								<VStack alignItems="flex-start" gap={1}>
									<styled.h3 fontFamily="heading" fontSize="lg" fontWeight="700">
										{p.title}
									</styled.h3>
									<styled.p textStyle="body.base" color="onSurfaceVariant">
										{p.body}
									</styled.p>
								</VStack>
							</styled.div>
						))}
					</VStack>
				</VStack>

				{/* Research Card — replaces fake testimonial */}
				<styled.div
					position="relative"
					bg="surfaceContainerLowest"
					padding={8}
					borderRadius="xl"
					boxShadow="lg"
					border="1px solid"
					borderColor="outlineVariant/10"
				>
					<styled.div
						position="absolute"
						inset={0}
						background="linear-gradient(to bottom right, rgba(98,49,83,0.05), transparent)"
						borderRadius="xl"
					/>
					<VStack
						position="relative"
						zIndex={1}
						justifyContent="center"
						alignItems="center"
						textAlign="center"
						padding={{ base: 8, md: 12 }}
						gap={6}
					>
						<styled.span fontFamily="heading" fontSize="5xl" fontWeight="800" color="primary/35">
							2,847
						</styled.span>
						<styled.p fontFamily="heading" fontSize="xl" color="onSurface/80">
							Posts and rants we read across Reddit. Same frustrations, over and over.
						</styled.p>
						<styled.p textStyle="body.base" color="onSurfaceVariant" fontStyle="italic">
							The #1 answer: &ldquo;I start tracking it, then I quit because it takes too
							long.&rdquo;
						</styled.p>
						<VStack gap={2} alignItems="flex-start" width="100%" paddingInline={4}>
							<styled.span textStyle="body.sm" color="onSurface/60">
								Email chaos &mdash; 4 hrs/week
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurface/60">
								Meal planning &mdash; 3 hrs/week
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurface/60">
								Social posting &mdash; 5 hrs/week
							</styled.span>
						</VStack>
						<styled.span textStyle="label.upper" color="primary">
							Meldar starts where you stopped
						</styled.span>
					</VStack>
				</styled.div>
			</Grid>
		</styled.section>
	)
}
