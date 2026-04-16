export {
	type BookingPageParams,
	renderBookingPageTemplate,
} from './booking-page'
export { buildPersonalizationPrompt } from './booking-page-prompt'

import { type BookingPageParams, renderBookingPageTemplate } from './booking-page'

export type ArchetypeId = 'booking-page'

export type ArchetypeParams = {
	'booking-page': BookingPageParams
}

export function renderArchetypeTemplate<T extends ArchetypeId>(
	archetype: T,
	params: ArchetypeParams[T],
): Array<{ path: string; content: string }> {
	switch (archetype) {
		case 'booking-page':
			return renderBookingPageTemplate(params as BookingPageParams)
		default:
			throw new Error(`Unknown archetype: ${archetype}`)
	}
}
