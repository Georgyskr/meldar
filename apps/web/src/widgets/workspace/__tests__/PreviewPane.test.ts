import { describe, expect, it } from 'vitest'
import { isSafePreviewUrl } from '../lib/preview-url'

describe('isSafePreviewUrl', () => {
	it('rejects null', () => {
		expect(isSafePreviewUrl(null)).toBe(false)
	})

	it('rejects empty string', () => {
		expect(isSafePreviewUrl('')).toBe(false)
	})

	it('rejects javascript: scheme', () => {
		expect(isSafePreviewUrl('javascript:alert(1)')).toBe(false)
	})

	it('rejects data: scheme', () => {
		expect(isSafePreviewUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
	})

	it('rejects file: scheme', () => {
		expect(isSafePreviewUrl('file:///etc/passwd')).toBe(false)
	})

	it('rejects malformed URLs', () => {
		expect(isSafePreviewUrl('not a url')).toBe(false)
	})

	it('accepts https URLs', () => {
		expect(isSafePreviewUrl('https://sandbox.example.com/preview')).toBe(true)
	})

	it('accepts http URLs', () => {
		expect(isSafePreviewUrl('http://localhost:3001')).toBe(true)
	})
})
