export type HintId =
	| 'click-to-change'
	| 'tell-meldar'
	| 'your-dashboard'
	| 'automatic-reminder'
	| 'share-link'
	| 'booking-received'

export type Hint = {
	readonly id: HintId
	readonly text: string
	readonly trigger:
		| 'onboarding'
		| 'first-edit'
		| 'first-booking'
		| 'first-dashboard'
		| 'first-share'
		| 'first-agent-action'
}

export const HINTS: readonly Hint[] = [
	{
		id: 'click-to-change',
		text: 'You can change anything by clicking on it.',
		trigger: 'onboarding',
	},
	{
		id: 'tell-meldar',
		text: 'Tell Meldar what you want — like "make this pink" or "change the price to 50".',
		trigger: 'first-edit',
	},
	{
		id: 'your-dashboard',
		text: 'This is your dashboard. Every booking shows up here.',
		trigger: 'first-dashboard',
	},
	{
		id: 'automatic-reminder',
		text: 'Your AI receptionist will send a reminder the day before each booking.',
		trigger: 'first-agent-action',
	},
	{
		id: 'share-link',
		text: 'Share this link with your next client — WhatsApp, Instagram bio, or just text it.',
		trigger: 'first-share',
	},
	{
		id: 'booking-received',
		text: 'You just got a booking! Check your dashboard to approve or reschedule.',
		trigger: 'first-booking',
	},
]
