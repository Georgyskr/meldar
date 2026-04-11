import { describe, expect, it } from 'vitest'
import { BOOKING_VERTICALS, getVerticalById } from '../index'

describe('BOOKING_VERTICALS', () => {
	it('has at least 5 verticals', () => {
		expect(BOOKING_VERTICALS.length).toBeGreaterThanOrEqual(5)
	})

	it('every vertical has a unique id', () => {
		const ids = BOOKING_VERTICALS.map((v) => v.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('every vertical has at least 2 default services', () => {
		for (const v of BOOKING_VERTICALS) {
			expect(v.defaultServices.length).toBeGreaterThanOrEqual(2)
		}
	})

	it('every service has positive duration and non-negative price', () => {
		for (const v of BOOKING_VERTICALS) {
			for (const s of v.defaultServices) {
				expect(s.durationMinutes).toBeGreaterThan(0)
				expect(s.priceEur).toBeGreaterThanOrEqual(0)
			}
		}
	})

	it('every vertical has valid hours', () => {
		for (const v of BOOKING_VERTICALS) {
			expect(v.defaultHours.days.length).toBeGreaterThan(0)
			expect(v.defaultHours.start).toMatch(/^\d{2}:\d{2}$/)
			expect(v.defaultHours.end).toMatch(/^\d{2}:\d{2}$/)
		}
	})

	it('includes hair-beauty vertical', () => {
		expect(BOOKING_VERTICALS.find((v) => v.id === 'hair-beauty')).toBeDefined()
	})

	it('includes other as a catch-all', () => {
		expect(BOOKING_VERTICALS.find((v) => v.id === 'other')).toBeDefined()
	})
})

describe('getVerticalById', () => {
	it('returns the correct vertical', () => {
		const result = getVerticalById('consulting')
		expect(result).toBeDefined()
		expect(result?.label).toBe('Consulting')
	})

	it('returns undefined for unknown id', () => {
		expect(getVerticalById('nonexistent')).toBeUndefined()
	})
})
