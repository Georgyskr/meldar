import { describe, expect, it } from 'vitest'
import { getVerticalById } from '@/entities/booking-verticals'
import { EXAMPLE_PAGES } from '../model/example-pages'

describe('EXAMPLE_PAGES', () => {
	it('has exactly 3 entries', () => {
		expect(EXAMPLE_PAGES).toHaveLength(3)
	})

	it('each entry has required fields', () => {
		for (const page of EXAMPLE_PAGES) {
			expect(page.id).toBeTruthy()
			expect(page.title).toBeTruthy()
			expect(page.description).toBeTruthy()
			expect(page.verticalId).toBeTruthy()
			expect(page.services.length).toBeGreaterThan(0)
		}
	})

	it('every verticalId maps to a real vertical', () => {
		for (const page of EXAMPLE_PAGES) {
			expect(getVerticalById(page.verticalId)).toBeTruthy()
		}
	})

	it('services have name and durationMinutes but NOT priceEur', () => {
		for (const page of EXAMPLE_PAGES) {
			for (const svc of page.services) {
				expect(svc).toHaveProperty('name')
				expect(svc).toHaveProperty('durationMinutes')
				expect(svc).not.toHaveProperty('priceEur')
			}
		}
	})
})
