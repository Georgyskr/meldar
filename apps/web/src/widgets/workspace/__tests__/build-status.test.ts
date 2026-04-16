import { describe, expect, it } from 'vitest'
import { buildPreviewSrc } from '../lib/build-status'

describe('buildPreviewSrc', () => {
	it('appends cache-buster with ? when URL has no query', () => {
		expect(buildPreviewSrc('https://example.com/preview', 1234)).toBe(
			'https://example.com/preview?t=1234',
		)
	})

	it('appends cache-buster with & when URL already has query params', () => {
		expect(buildPreviewSrc('https://example.com/preview?foo=bar', 5678)).toBe(
			'https://example.com/preview?foo=bar&t=5678',
		)
	})

	it('handles localhost URLs', () => {
		expect(buildPreviewSrc('http://localhost:3001', 999)).toBe('http://localhost:3001?t=999')
	})
})
