import { describe, expect, it } from 'vitest'
import type { HintId } from '../index'
import { HINTS } from '../index'

describe('HINTS', () => {
	it('has at least 5 hints', () => {
		expect(HINTS.length).toBeGreaterThanOrEqual(5)
	})

	it('every hint has a unique id', () => {
		const ids = HINTS.map((h) => h.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('every hint has non-empty text', () => {
		for (const h of HINTS) {
			expect(h.text.length).toBeGreaterThan(0)
		}
	})

	it('no hint text contains forbidden words', () => {
		const forbidden = ['agent', 'prompt', 'customization', 'admin panel']
		for (const h of HINTS) {
			const lower = h.text.toLowerCase()
			for (const word of forbidden) {
				expect(lower).not.toContain(word)
			}
		}
	})

	it('includes the onboarding hint', () => {
		const onboarding = HINTS.find((h) => h.trigger === 'onboarding')
		expect(onboarding).toBeDefined()
		expect(onboarding?.text).toContain('clicking')
	})

	it('exports HintId type covering all hint ids', () => {
		const ids: HintId[] = HINTS.map((h) => h.id)
		expect(ids).toContain('click-to-change')
		expect(ids).toContain('tell-meldar')
		expect(ids).toContain('your-dashboard')
	})
})
