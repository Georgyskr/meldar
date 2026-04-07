import { describe, expect, it } from 'vitest'
import { computeStepWidthPct } from '../lib/step-progress'

describe('computeStepWidthPct', () => {
	it('returns 0% for the first of N steps', () => {
		expect(computeStepWidthPct({ current: 0, total: 8, label: 'Setup' })).toBe('0%')
	})

	it('returns the rounded percentage for mid-progress', () => {
		expect(computeStepWidthPct({ current: 1, total: 8, label: 'Setup' })).toBe('13%')
		expect(computeStepWidthPct({ current: 4, total: 8, label: 'Setup' })).toBe('50%')
	})

	it('returns 100% when current equals total', () => {
		expect(computeStepWidthPct({ current: 8, total: 8, label: 'Done' })).toBe('100%')
	})

	it('clamps over-100% values to 100%', () => {
		expect(computeStepWidthPct({ current: 99, total: 8, label: 'Done' })).toBe('100%')
	})

	it('clamps negative current to 0%', () => {
		expect(computeStepWidthPct({ current: -3, total: 8, label: 'Done' })).toBe('0%')
	})

	it('returns 0% when total is 0 instead of NaN', () => {
		expect(computeStepWidthPct({ current: 1, total: 0, label: 'Done' })).toBe('0%')
	})

	it('returns 0% when total is negative', () => {
		expect(computeStepWidthPct({ current: 1, total: -1, label: 'Done' })).toBe('0%')
	})
})
