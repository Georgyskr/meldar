import { getVerticalById } from '@/entities/booking-verticals'
import type { FunnelAction, FunnelState } from './types'

export const INITIAL_STATE: FunnelState = { screen: 'doorPicker' }

export function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
	switch (action.type) {
		case 'selectDoor':
			switch (action.door) {
				case 'a':
					return { screen: 'doorA', selectedVerticalId: null, businessName: '', websiteUrl: '' }
				case 'b':
					return { screen: 'doorB' }
				case 'c':
					return { screen: 'doorC', freeformText: '' }
			}
			break

		case 'back':
			if (state.screen === 'proposalPreview') {
				switch (state.sourceDoor) {
					case 'a':
						return {
							screen: 'doorA',
							selectedVerticalId: state.proposal.verticalId,
							businessName: state.proposal.businessName,
							websiteUrl: '',
						}
					case 'b':
						return { screen: 'doorB' }
					case 'c':
						return { screen: 'doorC', freeformText: '' }
				}
			}
			return INITIAL_STATE

		case 'submitDoorA': {
			const vertical = getVerticalById(action.verticalId)
			if (!vertical) return state
			return {
				screen: 'proposalPreview',
				sourceDoor: 'a',
				websiteUrl: action.websiteUrl.trim() || null,
				error: null,
				proposal: {
					verticalId: vertical.id,
					verticalLabel: vertical.label,
					businessName: action.businessName || `My ${vertical.label} business`,
					services: vertical.defaultServices.map((s) => ({
						name: s.name,
						durationMinutes: s.durationMinutes,
					})),
					hours: vertical.defaultHours,
				},
			}
		}

		case 'selectExample':
			if (state.screen !== 'doorB') return state
			return {
				screen: 'proposalPreview',
				sourceDoor: 'b',
				websiteUrl: null,
				error: null,
				proposal: action.proposal,
			}

		case 'submitFreeform':
			if (state.screen !== 'doorC') return state
			return {
				screen: 'proposalPreview',
				sourceDoor: 'c',
				websiteUrl: null,
				error: null,
				proposal: action.proposal,
			}

		case 'confirm':
			if (state.screen !== 'proposalPreview') return state
			return {
				screen: 'submitting',
				proposal: state.proposal,
				sourceDoor: state.sourceDoor,
				websiteUrl: state.websiteUrl,
			}

		case 'success':
			return { screen: 'complete', projectId: action.projectId, subdomain: action.subdomain }

		case 'failure':
			if (state.screen !== 'submitting') return state
			return {
				screen: 'proposalPreview',
				sourceDoor: state.sourceDoor,
				websiteUrl: state.websiteUrl,
				error: action.error,
				proposal: state.proposal,
			}
	}

	return state
}
