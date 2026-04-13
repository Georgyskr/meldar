import { describe, expect, it } from 'vitest'
import { funnelReducer, INITIAL_STATE } from '../model/funnel-machine'
import type { FunnelState, ProposalData } from '../model/types'

const MOCK_PROPOSAL: ProposalData = {
	verticalId: 'consulting',
	verticalLabel: 'Consulting',
	businessName: 'Test Biz',
	services: [{ name: 'Strategy call', durationMinutes: 60 }],
	hours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' },
}

describe('funnelReducer', () => {
	it('starts on doorPicker', () => {
		expect(INITIAL_STATE.screen).toBe('doorPicker')
	})

	it('selectDoor transitions to the correct door screen', () => {
		expect(funnelReducer(INITIAL_STATE, { type: 'selectDoor', door: 'a' }).screen).toBe('doorA')
		expect(funnelReducer(INITIAL_STATE, { type: 'selectDoor', door: 'b' }).screen).toBe('doorB')
		expect(funnelReducer(INITIAL_STATE, { type: 'selectDoor', door: 'c' }).screen).toBe('doorC')
	})

	it('back from any door returns to doorPicker', () => {
		const doorA: FunnelState = {
			screen: 'doorA',
			selectedVerticalId: null,
			businessName: '',
			websiteUrl: '',
		}
		expect(funnelReducer(doorA, { type: 'back' }).screen).toBe('doorPicker')

		const doorB: FunnelState = { screen: 'doorB' }
		expect(funnelReducer(doorB, { type: 'back' }).screen).toBe('doorPicker')

		const doorC: FunnelState = { screen: 'doorC', freeformText: '' }
		expect(funnelReducer(doorC, { type: 'back' }).screen).toBe('doorPicker')
	})

	it('submitDoorA transitions to proposalPreview with sourceDoor a', () => {
		const doorA: FunnelState = {
			screen: 'doorA',
			selectedVerticalId: 'consulting',
			businessName: 'My Biz',
			websiteUrl: '',
		}
		const next = funnelReducer(doorA, {
			type: 'submitDoorA',
			verticalId: 'consulting',
			businessName: 'My Biz',
			websiteUrl: '',
		})
		expect(next.screen).toBe('proposalPreview')
		if (next.screen === 'proposalPreview') {
			expect(next.sourceDoor).toBe('a')
			expect(next.proposal.verticalId).toBe('consulting')
			expect(next.proposal.businessName).toBe('My Biz')
			expect(next.proposal.services.length).toBeGreaterThan(0)
		}
	})

	it('selectExample transitions to proposalPreview with sourceDoor b', () => {
		const doorB: FunnelState = { screen: 'doorB' }
		const next = funnelReducer(doorB, { type: 'selectExample', proposal: MOCK_PROPOSAL })
		expect(next.screen).toBe('proposalPreview')
		if (next.screen === 'proposalPreview') {
			expect(next.sourceDoor).toBe('b')
			expect(next.proposal).toBe(MOCK_PROPOSAL)
		}
	})

	it('submitFreeform transitions to proposalPreview with sourceDoor c', () => {
		const doorC: FunnelState = { screen: 'doorC', freeformText: 'I do yoga' }
		const next = funnelReducer(doorC, { type: 'submitFreeform', proposal: MOCK_PROPOSAL })
		expect(next.screen).toBe('proposalPreview')
		if (next.screen === 'proposalPreview') {
			expect(next.sourceDoor).toBe('c')
		}
	})

	it('back from proposalPreview returns to the source door', () => {
		const previewFromA: FunnelState = {
			screen: 'proposalPreview',
			proposal: MOCK_PROPOSAL,
			sourceDoor: 'a',
			error: null,
		}
		expect(funnelReducer(previewFromA, { type: 'back' }).screen).toBe('doorA')

		const previewFromB: FunnelState = {
			screen: 'proposalPreview',
			proposal: MOCK_PROPOSAL,
			sourceDoor: 'b',
			error: null,
		}
		expect(funnelReducer(previewFromB, { type: 'back' }).screen).toBe('doorB')

		const previewFromC: FunnelState = {
			screen: 'proposalPreview',
			proposal: MOCK_PROPOSAL,
			sourceDoor: 'c',
			error: null,
		}
		expect(funnelReducer(previewFromC, { type: 'back' }).screen).toBe('doorC')
	})

	it('confirm transitions from proposalPreview to submitting', () => {
		const preview: FunnelState = {
			screen: 'proposalPreview',
			proposal: MOCK_PROPOSAL,
			sourceDoor: 'a',
			error: null,
		}
		const next = funnelReducer(preview, { type: 'confirm' })
		expect(next.screen).toBe('submitting')
		if (next.screen === 'submitting') {
			expect(next.proposal).toBe(MOCK_PROPOSAL)
		}
	})

	it('success transitions to complete with projectId', () => {
		const submitting: FunnelState = { screen: 'submitting', proposal: MOCK_PROPOSAL }
		const next = funnelReducer(submitting, {
			type: 'success',
			projectId: 'proj-123',
			subdomain: 'test.meldar.ai',
		})
		expect(next.screen).toBe('complete')
		if (next.screen === 'complete') {
			expect(next.projectId).toBe('proj-123')
			expect(next.subdomain).toBe('test.meldar.ai')
		}
	})

	it('failure transitions back to proposalPreview with error', () => {
		const submitting: FunnelState = { screen: 'submitting', proposal: MOCK_PROPOSAL }
		const next = funnelReducer(submitting, { type: 'failure', error: 'Network error' })
		expect(next.screen).toBe('proposalPreview')
		if (next.screen === 'proposalPreview') {
			expect(next.error).toBe('Network error')
			expect(next.proposal).toBe(MOCK_PROPOSAL)
		}
	})
})
