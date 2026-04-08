import { TEMPLATE_PLANS } from '@meldar/orchestrator'
import { describe, expect, it } from 'vitest'

describe('TemplatePicker data integration', () => {
	it('TEMPLATE_PLANS has 9 templates available for the picker', () => {
		expect(TEMPLATE_PLANS.length).toBe(9)
	})

	it('each template has a unique id suitable for URL params', () => {
		const ids = TEMPLATE_PLANS.map((t) => t.id)
		expect(new Set(ids).size).toBe(ids.length)
		for (const id of ids) {
			expect(id).toMatch(/^[a-z0-9-]+$/)
		}
	})

	it('each template has a user-facing name and description', () => {
		for (const template of TEMPLATE_PLANS) {
			expect(template.name.length).toBeGreaterThan(0)
			expect(template.description.length).toBeGreaterThan(0)
		}
	})

	it('template names are short enough for card buttons', () => {
		for (const template of TEMPLATE_PLANS) {
			expect(template.name.length).toBeLessThanOrEqual(30)
		}
	})

	it('descriptions never use technical language', () => {
		const techTerms = ['component', 'render', 'state', 'props', 'api', 'endpoint', 'schema']
		for (const template of TEMPLATE_PLANS) {
			const lower = template.description.toLowerCase()
			for (const term of techTerms) {
				expect(lower).not.toContain(term)
			}
		}
	})
})
