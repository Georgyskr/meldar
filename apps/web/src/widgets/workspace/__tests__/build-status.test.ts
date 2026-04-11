import { describe, expect, it } from 'vitest'
import { buildPreviewSrc, deriveBuildStatus } from '../lib/build-status'

describe('deriveBuildStatus', () => {
	it('returns building when activeBuildCardId is set', () => {
		expect(deriveBuildStatus('card-1', null)).toBe('building')
	})

	it('returns building even when failureMessage is also set', () => {
		expect(deriveBuildStatus('card-1', 'some error')).toBe('building')
	})

	it('returns failed when no active build but failure exists', () => {
		expect(deriveBuildStatus(null, 'timeout')).toBe('failed')
	})

	it('returns idle when both are null', () => {
		expect(deriveBuildStatus(null, null)).toBe('idle')
	})
})

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
