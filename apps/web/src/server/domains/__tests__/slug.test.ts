import { describe, expect, it } from 'vitest'
import { appendCollisionSuffix, generateSlug, generateSubdomain } from '../slug'

describe('generateSlug', () => {
	it('lowercases and replaces spaces with hyphens', () => {
		expect(generateSlug('My Project')).toBe('my-project')
	})

	it('strips possessive apostrophes and special chars', () => {
		expect(generateSlug("Elif's Studio")).toBe('elifs-studio')
	})

	it('collapses multiple spaces and hyphens', () => {
		expect(generateSlug('  hello   world  ')).toBe('hello-world')
		expect(generateSlug('a--b---c')).toBe('a-b-c')
	})

	it('removes leading and trailing hyphens', () => {
		expect(generateSlug('-hello-')).toBe('hello')
	})

	it('strips accented characters via NFD normalization', () => {
		expect(generateSlug('Café Résumé')).toBe('cafe-resume')
	})

	it('handles emoji and non-latin characters', () => {
		expect(generateSlug('🚀 Launch')).toBe('launch')
	})

	it('returns "project" for empty or whitespace-only input', () => {
		expect(generateSlug('')).toBe('project')
		expect(generateSlug('   ')).toBe('project')
		expect(generateSlug('!!!')).toBe('project')
	})

	it('preserves numbers', () => {
		expect(generateSlug('Project 42')).toBe('project-42')
	})

	it('handles already-slugified input', () => {
		expect(generateSlug('my-project')).toBe('my-project')
	})
})

describe('generateSubdomain', () => {
	it('appends .meldar.ai to the slug', () => {
		expect(generateSubdomain('elifs-studio')).toBe('elifs-studio.meldar.ai')
	})

	it('works with single-word slugs', () => {
		expect(generateSubdomain('project')).toBe('project.meldar.ai')
	})
})

describe('appendCollisionSuffix', () => {
	it('appends a hyphen and 4-character suffix', () => {
		const result = appendCollisionSuffix('my-project')
		expect(result).toMatch(/^my-project-[a-z0-9]{4}$/)
	})

	it('produces different suffixes on repeated calls', () => {
		const results = new Set<string>()
		for (let i = 0; i < 20; i++) {
			results.add(appendCollisionSuffix('test'))
		}
		expect(results.size).toBeGreaterThan(1)
	})
})
