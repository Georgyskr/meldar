export type BookingVertical = {
	readonly id: string
	readonly label: string
	readonly icon: string
	readonly defaultServices: ReadonlyArray<{
		readonly name: string
		readonly durationMinutes: number
		readonly priceEur: number
	}>
	readonly defaultHours: {
		readonly days: readonly string[]
		readonly start: string
		readonly end: string
	}
	readonly slotDurationMinutes: number
}

export const BOOKING_VERTICALS: readonly BookingVertical[] = [
	{
		id: 'hair-beauty',
		label: 'Hair / Beauty',
		icon: 'Scissors',
		defaultServices: [
			{ name: 'Haircut', durationMinutes: 45, priceEur: 45 },
			{ name: 'Color', durationMinutes: 90, priceEur: 85 },
			{ name: 'Blowout', durationMinutes: 30, priceEur: 35 },
		],
		defaultHours: { days: ['tue', 'wed', 'thu', 'fri', 'sat'], start: '10:00', end: '18:00' },
		slotDurationMinutes: 30,
	},
	{
		id: 'pt-wellness',
		label: 'PT / Wellness',
		icon: 'Dumbbell',
		defaultServices: [
			{ name: 'Personal training (60 min)', durationMinutes: 60, priceEur: 65 },
			{ name: 'Massage therapy', durationMinutes: 60, priceEur: 70 },
			{ name: 'Assessment session', durationMinutes: 45, priceEur: 50 },
		],
		defaultHours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '08:00', end: '20:00' },
		slotDurationMinutes: 60,
	},
	{
		id: 'tattoo-piercing',
		label: 'Tattoo / Piercing',
		icon: 'Pen',
		defaultServices: [
			{ name: 'Small tattoo (under 5cm)', durationMinutes: 60, priceEur: 80 },
			{ name: 'Medium tattoo (5-15cm)', durationMinutes: 120, priceEur: 200 },
			{ name: 'Piercing', durationMinutes: 30, priceEur: 40 },
		],
		defaultHours: { days: ['tue', 'wed', 'thu', 'fri', 'sat'], start: '11:00', end: '19:00' },
		slotDurationMinutes: 30,
	},
	{
		id: 'consulting',
		label: 'Consulting',
		icon: 'Briefcase',
		defaultServices: [
			{ name: 'Discovery call (15 min)', durationMinutes: 15, priceEur: 0 },
			{ name: 'Strategy session (60 min)', durationMinutes: 60, priceEur: 120 },
			{ name: 'Coaching session (45 min)', durationMinutes: 45, priceEur: 95 },
		],
		defaultHours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' },
		slotDurationMinutes: 15,
	},
	{
		id: 'other',
		label: 'Other',
		icon: 'Store',
		defaultServices: [
			{ name: 'Standard appointment', durationMinutes: 60, priceEur: 50 },
			{ name: 'Short consultation', durationMinutes: 30, priceEur: 30 },
			{ name: 'Extended session', durationMinutes: 90, priceEur: 80 },
		],
		defaultHours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' },
		slotDurationMinutes: 30,
	},
]

export function getVerticalById(id: string): BookingVertical | undefined {
	return BOOKING_VERTICALS.find((v) => v.id === id)
}
