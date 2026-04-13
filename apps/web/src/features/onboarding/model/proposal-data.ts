import { BOOKING_VERTICALS, getVerticalById } from '@/entities/booking-verticals'
import type { ProposalData } from './types'

export function buildProposalFromDoorA(
	verticalId: string,
	businessName: string,
): ProposalData | null {
	const vertical = getVerticalById(verticalId)
	if (!vertical) return null

	return {
		verticalId: vertical.id,
		verticalLabel: vertical.label,
		businessName: businessName.trim() || `My ${vertical.label} business`,
		services: vertical.defaultServices.map((s) => ({
			name: s.name,
			durationMinutes: s.durationMinutes,
		})),
		hours: vertical.defaultHours,
	}
}

const KEYWORD_MAP: ReadonlyArray<{
	readonly keywords: readonly string[]
	readonly verticalId: string
}> = [
	{
		keywords: ['hair', 'salon', 'haircut', 'coloring', 'barber', 'beauty'],
		verticalId: 'hair-beauty',
	},
	{
		keywords: ['personal training', 'fitness', 'gym', 'yoga', 'pilates', 'wellness', 'massage'],
		verticalId: 'pt-wellness',
	},
	{ keywords: ['tattoo', 'piercing', 'ink'], verticalId: 'tattoo-piercing' },
	{
		keywords: ['consulting', 'strategy', 'coaching', 'advisory', 'mentor'],
		verticalId: 'consulting',
	},
]

function inferVerticalFromText(text: string): string {
	const lower = text.toLowerCase()
	for (const entry of KEYWORD_MAP) {
		if (entry.keywords.some((kw) => lower.includes(kw))) {
			return entry.verticalId
		}
	}
	return 'other'
}

export function buildProposalFromFreeform(text: string, businessName: string): ProposalData {
	const verticalId = inferVerticalFromText(text)
	const vertical = BOOKING_VERTICALS.find((v) => v.id === verticalId)
	const fallback = BOOKING_VERTICALS.find((v) => v.id === 'other')
	const v = vertical ?? fallback

	return {
		verticalId: v?.id ?? 'other',
		verticalLabel: v?.label ?? 'Other',
		businessName: businessName.trim() || `My ${v?.label ?? 'Other'} business`,
		services: (v?.defaultServices ?? []).map((s) => ({
			name: s.name,
			durationMinutes: s.durationMinutes,
		})),
		hours: v?.defaultHours ?? {
			days: ['mon', 'tue', 'wed', 'thu', 'fri'],
			start: '09:00',
			end: '17:00',
		},
	}
}
