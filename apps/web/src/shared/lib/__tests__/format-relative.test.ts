import { describe, expect, it } from 'vitest'
import { formatRelative } from '@/shared/lib/format-relative'

const NOW = 1_700_000_000_000

describe('formatRelative', () => {
	it('returns "just now" for timestamps within 5 seconds', () => {
		expect(formatRelative(NOW, NOW)).toBe('just now')
		expect(formatRelative(NOW - 4_000, NOW)).toBe('just now')
	})

	it('clamps future timestamps to "just now" instead of negative seconds', () => {
		expect(formatRelative(NOW + 60_000, NOW)).toBe('just now')
	})

	it('returns seconds between 5 and 59', () => {
		expect(formatRelative(NOW - 12_000, NOW)).toBe('12s ago')
		expect(formatRelative(NOW - 59_000, NOW)).toBe('59s ago')
	})

	it('returns minutes between 1 and 59', () => {
		expect(formatRelative(NOW - 60_000, NOW)).toBe('1m ago')
		expect(formatRelative(NOW - 30 * 60_000, NOW)).toBe('30m ago')
	})

	it('returns hours between 1 and 23', () => {
		expect(formatRelative(NOW - 60 * 60_000, NOW)).toBe('1h ago')
		expect(formatRelative(NOW - 5 * 60 * 60_000, NOW)).toBe('5h ago')
	})

	it('returns days for >= 24 hours', () => {
		expect(formatRelative(NOW - 24 * 60 * 60_000, NOW)).toBe('1d ago')
		expect(formatRelative(NOW - 7 * 24 * 60 * 60_000, NOW)).toBe('7d ago')
	})
})
