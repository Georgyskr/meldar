import { Grid, styled, VStack } from '@styled-system/jsx'
import { GraduationCap, Mail, Receipt, Share2, Tag, UtensilsCrossed } from 'lucide-react'

const skills = [
	{
		icon: UtensilsCrossed,
		name: 'Meal planner',
		desc: "What's in your fridge becomes a week of meals and a grocery list. Every week. Automatically.",
	},
	{
		icon: GraduationCap,
		name: 'Grade watcher',
		desc: 'Get a text the second your professor posts a grade. Never refresh that portal again.',
	},
	{
		icon: Tag,
		name: 'Price watcher',
		desc: "Pick any product online. Get a message when the price drops or it's back in stock.",
	},
	{
		icon: Mail,
		name: 'Email triage',
		desc: 'Your inbox sorted by what actually matters. Replies drafted in your tone. You just review and send.',
	},
	{
		icon: Receipt,
		name: 'Expense sorter',
		desc: 'Forward a receipt. Everything categorized and totaled. Tax season stops being scary.',
	},
	{
		icon: Share2,
		name: 'Social poster',
		desc: 'Write once. Goes to Instagram, LinkedIn, X, and TikTok. Formatted right for each one.',
	},
]

export function SkillCardsSection() {
	return (
		<styled.section paddingBlock={32} paddingInline={8} bg="surface">
			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={16}>
				<VStack textAlign="center" gap={4}>
					<styled.h2 textStyle="heading.section" color="onSurface">
						Things people build in their first week
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant" maxWidth="480px">
						Real problems. Personal apps. Each takes minutes to set up.
					</styled.p>
				</VStack>

				<Grid columns={{ base: 1, sm: 2, md: 3 }} gap={6} width="100%">
					{skills.map((s) => (
						<styled.div
							key={s.name}
							bg="surfaceContainerLowest"
							padding={8}
							borderRadius="xl"
							border="1px solid"
							borderColor="outlineVariant/5"
							transition="all 0.2s ease"
							_hover={{ borderColor: 'primary/20' }}
						>
							<s.icon size={28} color="#623153" strokeWidth={1.5} aria-hidden="true" />
							<styled.h3
								fontFamily="heading"
								fontWeight="700"
								marginBlockStart={4}
								marginBlockEnd={2}
							>
								{s.name}
							</styled.h3>
							<styled.p fontSize="sm" color="onSurfaceVariant" lineHeight="relaxed">
								{s.desc}
							</styled.p>
						</styled.div>
					))}
				</Grid>
			</VStack>
		</styled.section>
	)
}
