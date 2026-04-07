import { describe, expect, it } from 'vitest'
import { balanceColor } from '../TokenBalancePill'

describe('balanceColor', () => {
	it('returns green for balance above 50', () => {
		expect(balanceColor(51)).toBe('green.600')
		expect(balanceColor(200)).toBe('green.600')
	})

	it('returns amber for balance between 10 and 50', () => {
		expect(balanceColor(50)).toBe('amber.600')
		expect(balanceColor(10)).toBe('amber.600')
		expect(balanceColor(25)).toBe('amber.600')
	})

	it('returns red for balance below 10', () => {
		expect(balanceColor(9)).toBe('red.600')
		expect(balanceColor(0)).toBe('red.600')
		expect(balanceColor(-5)).toBe('red.600')
	})
})
