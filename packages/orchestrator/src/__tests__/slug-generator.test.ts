import { describe, expect, it } from 'vitest'
import { generateSafeSlug, generateSlug, isReservedSlug, isValidSlug } from '../slug-generator'

function seededRand(seed: number): () => number {
	let s = seed
	return () => {
		s = (s * 9301 + 49297) % 233280
		return s / 233280
	}
}

describe('slug-generator', () => {
	describe('generateSlug', () => {
		it('produces a slug in the adjective-noun-NNNN shape', () => {
			const slug = generateSlug(seededRand(42))
			expect(slug).toMatch(/^[a-z]+-[a-z]+-\d{4}$/)
		})

		it('is deterministic given a seed', () => {
			const a = generateSlug(seededRand(123))
			const b = generateSlug(seededRand(123))
			expect(a).toBe(b)
		})

		it('is under 30 characters', () => {
			for (let i = 0; i < 100; i++) {
				const slug = generateSlug(seededRand(i))
				expect(slug.length).toBeLessThanOrEqual(30)
			}
		})

		it('always matches valid slug format', () => {
			for (let i = 0; i < 200; i++) {
				const slug = generateSlug(seededRand(i))
				expect(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)).toBe(true)
			}
		})
	})

	describe('isValidSlug', () => {
		it('accepts valid slugs', () => {
			expect(isValidSlug('quiet-forest-4721')).toBe(true)
			expect(isValidSlug('abc')).toBe(true)
			expect(isValidSlug('a1b2c3')).toBe(true)
		})

		it('rejects reserved words as exact match', () => {
			expect(isValidSlug('admin')).toBe(false)
			expect(isValidSlug('login')).toBe(false)
			expect(isValidSlug('api')).toBe(false)
		})

		it('rejects reserved words as first segment', () => {
			expect(isValidSlug('admin-panel-1234')).toBe(false)
			expect(isValidSlug('api-keys-5678')).toBe(false)
		})

		it('rejects empty, too long, and malformed slugs', () => {
			expect(isValidSlug('')).toBe(false)
			expect(isValidSlug('a'.repeat(64))).toBe(false)
			expect(isValidSlug('-leading')).toBe(false)
			expect(isValidSlug('trailing-')).toBe(false)
			expect(isValidSlug('UPPERCASE')).toBe(false)
			expect(isValidSlug('has spaces')).toBe(false)
			expect(isValidSlug('under_score')).toBe(false)
		})

		it('accepts 63-char boundary', () => {
			const slug = `a${'b'.repeat(62)}`
			expect(isValidSlug(slug)).toBe(true)
		})
	})

	describe('isReservedSlug', () => {
		it('flags reserved words', () => {
			expect(isReservedSlug('admin')).toBe(true)
			expect(isReservedSlug('api')).toBe(true)
			expect(isReservedSlug('quiet-forest-4721')).toBe(false)
		})
	})

	describe('generateSafeSlug', () => {
		it('always returns a valid slug', () => {
			for (let i = 0; i < 50; i++) {
				const slug = generateSafeSlug(seededRand(i))
				expect(isValidSlug(slug)).toBe(true)
			}
		})
	})
})
