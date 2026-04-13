import { describe, expect, it } from 'vitest'
import { buildProposalFromDoorA, buildProposalFromFreeform } from '../model/proposal-data'

describe('buildProposalFromDoorA', () => {
	it('returns proposal with services from vertical defaults', () => {
		const result = buildProposalFromDoorA('consulting', 'My Biz')
		if (!result) throw new Error('expected result')
		expect(result.verticalId).toBe('consulting')
		expect(result.verticalLabel).toBe('Consulting')
		expect(result.businessName).toBe('My Biz')
		expect(result.services.length).toBeGreaterThan(0)
	})

	it('strips prices — services only have name and durationMinutes', () => {
		const result = buildProposalFromDoorA('hair-beauty', 'Salon')
		if (!result) throw new Error('expected result')
		for (const svc of result.services) {
			expect(svc).toHaveProperty('name')
			expect(svc).toHaveProperty('durationMinutes')
			expect(svc).not.toHaveProperty('priceEur')
		}
	})

	it('falls back to business name from vertical label when name is empty', () => {
		const result = buildProposalFromDoorA('pt-wellness', '')
		expect(result?.businessName).toBe('My PT / Wellness business')
	})

	it('returns null for unknown vertical', () => {
		const result = buildProposalFromDoorA('nonexistent', 'Biz')
		expect(result).toBeNull()
	})

	it('includes hours from vertical defaults', () => {
		const result = buildProposalFromDoorA('consulting', 'Biz')
		expect(result?.hours.days).toContain('mon')
		expect(result?.hours.start).toBe('09:00')
	})
})

describe('buildProposalFromFreeform', () => {
	it('infers hair-beauty for "haircuts" keyword', () => {
		const result = buildProposalFromFreeform('I do haircuts and coloring', 'Studio')
		expect(result.verticalId).toBe('hair-beauty')
	})

	it('infers pt-wellness for "personal training" keyword', () => {
		const result = buildProposalFromFreeform('I run a personal training business', 'FitLab')
		expect(result.verticalId).toBe('pt-wellness')
	})

	it('infers consulting for "consulting" keyword', () => {
		const result = buildProposalFromFreeform('I offer consulting services', 'Consult Co')
		expect(result.verticalId).toBe('consulting')
	})

	it('falls back to other when no keywords match', () => {
		const result = buildProposalFromFreeform('I sell handmade candles', 'Candle Shop')
		expect(result.verticalId).toBe('other')
	})

	it('is case-insensitive', () => {
		const result = buildProposalFromFreeform('I DO PERSONAL TRAINING', 'Gym')
		expect(result.verticalId).toBe('pt-wellness')
	})
})
