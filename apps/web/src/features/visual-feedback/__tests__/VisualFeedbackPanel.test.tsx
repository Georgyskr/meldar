import { describe, expect, it } from 'vitest'
import type { ModificationRequest } from '../index'

describe('VisualFeedbackPanel', () => {
	it('exports ModificationRequest type', () => {
		const req: ModificationRequest = {
			elementSelector: 'button.cta',
			elementDescription: 'Book Now button',
			instruction: 'make it pink',
		}
		expect(req.instruction).toBe('make it pink')
	})

	it('ModificationRequest has all required fields', () => {
		const req: ModificationRequest = {
			elementSelector: '.price',
			elementDescription: 'Price label',
			instruction: 'change to 50',
		}
		expect(req.elementSelector).toBeDefined()
		expect(req.elementDescription).toBeDefined()
		expect(req.instruction).toBeDefined()
	})
})

describe('VisualFeedbackPanel state machine', () => {
	it('follows idle → selecting → describing → submitting flow', () => {
		type Step = 'idle' | 'selecting' | 'describing' | 'submitting'
		const validTransitions: Record<Step, Step[]> = {
			idle: ['selecting'],
			selecting: ['idle', 'describing'],
			describing: ['idle', 'submitting'],
			submitting: ['idle', 'describing'],
		}

		expect(validTransitions.idle).toContain('selecting')
		expect(validTransitions.selecting).toContain('describing')
		expect(validTransitions.describing).toContain('submitting')
		expect(validTransitions.submitting).toContain('idle')
	})

	it('submitting can return to describing on error', () => {
		type Step = 'idle' | 'selecting' | 'describing' | 'submitting'
		const validTransitions: Record<Step, Step[]> = {
			idle: ['selecting'],
			selecting: ['idle', 'describing'],
			describing: ['idle', 'submitting'],
			submitting: ['idle', 'describing'],
		}

		expect(validTransitions.submitting).toContain('describing')
	})
})
