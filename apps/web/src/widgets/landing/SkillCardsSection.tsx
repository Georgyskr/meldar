import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { GraduationCap, Mail, Receipt, Share2, Tag, UtensilsCrossed } from 'lucide-react'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

const skills = [
	{
		number: '001',
		icon: UtensilsCrossed,
		name: 'Meal planner',
		desc: "What's in your fridge becomes a week of meals and a grocery list. Every week. Automatically.",
	},
	{
		number: '002',
		icon: GraduationCap,
		name: 'Grade watcher',
		desc: 'Get a text the second your professor posts a grade. Never refresh that portal again.',
	},
	{
		number: '003',
		icon: Tag,
		name: 'Price watcher',
		desc: "Pick any product online. Get a message when the price drops or it's back in stock.",
	},
	{
		number: '004',
		icon: Mail,
		name: 'Email triage',
		desc: 'Your inbox sorted by what actually matters. Replies drafted in your tone. You just review and send.',
	},
	{
		number: '005',
		icon: Receipt,
		name: 'Expense sorter',
		desc: 'Forward a receipt. Everything categorized and totaled. Tax season stops being scary.',
	},
	{
		number: '006',
		icon: Share2,
		name: 'Social poster',
		desc: 'Write once. Goes to Instagram, LinkedIn, X, and TikTok. Formatted right for each one.',
	},
]

export function SkillCardsSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surfaceContainerLow"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto" position="relative">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="006" label="What first-timers made" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '3fr 2fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
					marginBlockEnd={{ base: 12, md: 16 }}
				>
					<Heading as="h2" textStyle="primary.xl" color="onSurface">
						Real problems.
						<br />
						<Text as="em" textStyle="italic.lg" color="primary">
							Personal fixes.
						</Text>
						<br />
						Minutes to set up.
					</Heading>

					<Box display={{ base: 'none', md: 'block' }}>
						<EditorialPlate
							src="/brand/editorial-plate-06-skills.jpg"
							plateNumber="06"
							caption="The constellation."
							aspectRatio="5/4"
						/>
					</Box>
				</Grid>

				{/* Editorial grid of skills */}
				<Box borderTop="2px solid" borderColor="onSurface">
					<Grid gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}>
						{skills.map((s, i) => (
							<SkillEntry key={s.name} {...s} index={i} />
						))}
					</Grid>
				</Box>
			</Box>
		</styled.section>
	)
}

function SkillEntry({
	number,
	icon: Icon,
	name,
	desc,
	index,
}: {
	number: string
	icon: typeof UtensilsCrossed
	name: string
	desc: string
	index: number
}) {
	return (
		<Box
			paddingBlock={{ base: 7, md: 9 }}
			paddingInline={{ base: 5, md: 7 }}
			borderBottom="1px solid"
			borderInlineEnd={{
				base: 'none',
				sm: index % 2 === 0 ? '1px solid' : 'none',
				md: (index + 1) % 3 !== 0 ? '1px solid' : 'none',
			}}
			borderColor="onSurface/20"
			transition="all 0.3s ease"
			cursor="default"
			_hover={{
				bg: 'primary/4',
				_focus: { outline: 'none' },
			}}
		>
			<VStack alignItems="flex-start" gap={4}>
				<Box display="flex" justifyContent="space-between" alignItems="flex-start" width="100%">
					<Text textStyle="tertiary.md" color="primary">
						Nº {number}
					</Text>
					<Icon size={24} color="#623153" strokeWidth={1.5} aria-hidden="true" />
				</Box>
				<Heading as="h3" textStyle="primary.md" color="onSurface">
					{name}
				</Heading>
				<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
					{desc}
				</Text>
			</VStack>
		</Box>
	)
}
