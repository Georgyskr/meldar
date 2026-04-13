import type { ProposalService } from './types'

export type ExamplePage = {
	readonly id: string
	readonly title: string
	readonly description: string
	readonly verticalId: string
	readonly services: readonly ProposalService[]
}

export const EXAMPLE_PAGES: readonly ExamplePage[] = [
	{
		id: 'hair-salon-example',
		title: "Sofia's Hair Studio",
		description: 'Booking page for a neighborhood hair salon with 3 services',
		verticalId: 'hair-beauty',
		services: [
			{ name: 'Haircut', durationMinutes: 45 },
			{ name: 'Color', durationMinutes: 90 },
			{ name: 'Blowout', durationMinutes: 30 },
		],
	},
	{
		id: 'pt-example',
		title: 'Peak Fitness PT',
		description: 'Personal training studio with sessions and assessments',
		verticalId: 'pt-wellness',
		services: [
			{ name: 'Personal training (60 min)', durationMinutes: 60 },
			{ name: 'Assessment session', durationMinutes: 45 },
			{ name: 'Group class', durationMinutes: 45 },
		],
	},
	{
		id: 'consulting-example',
		title: 'Anna Strategy',
		description: 'Business consulting with discovery calls and strategy sessions',
		verticalId: 'consulting',
		services: [
			{ name: 'Discovery call (15 min)', durationMinutes: 15 },
			{ name: 'Strategy session (60 min)', durationMinutes: 60 },
			{ name: 'Coaching session (45 min)', durationMinutes: 45 },
		],
	},
]
