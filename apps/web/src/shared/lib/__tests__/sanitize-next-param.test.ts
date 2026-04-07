import { describe, expect, it } from 'vitest'
import { sanitizeNextParam } from '../sanitize-next-param'

describe('sanitizeNextParam', () => {
	describe('falsy and empty inputs', () => {
		it('returns /workspace for null', () => {
			expect(sanitizeNextParam(null)).toBe('/workspace')
		})

		it('returns /workspace for undefined', () => {
			expect(sanitizeNextParam(undefined)).toBe('/workspace')
		})

		it('returns /workspace for empty string', () => {
			expect(sanitizeNextParam('')).toBe('/workspace')
		})
	})

	describe('legitimate same-origin paths', () => {
		it('passes through /workspace', () => {
			expect(sanitizeNextParam('/workspace')).toBe('/workspace')
		})

		it('passes through /workspace/abc', () => {
			expect(sanitizeNextParam('/workspace/abc')).toBe('/workspace/abc')
		})

		it('passes through bare root /', () => {
			expect(sanitizeNextParam('/')).toBe('/')
		})

		it('passes through /foo', () => {
			expect(sanitizeNextParam('/foo')).toBe('/foo')
		})
	})

	describe('protocol-relative and absolute URL injection', () => {
		it('rejects //evil.com', () => {
			expect(sanitizeNextParam('//evil.com')).toBe('/workspace')
		})

		it('rejects ///evil', () => {
			expect(sanitizeNextParam('///evil')).toBe('/workspace')
		})

		it('rejects http://evil', () => {
			expect(sanitizeNextParam('http://evil')).toBe('/workspace')
		})

		it('rejects https://evil', () => {
			expect(sanitizeNextParam('https://evil')).toBe('/workspace')
		})

		it('rejects javascript:alert(1)', () => {
			expect(sanitizeNextParam('javascript:alert(1)')).toBe('/workspace')
		})

		it('rejects data:text/html,foo', () => {
			expect(sanitizeNextParam('data:text/html,foo')).toBe('/workspace')
		})
	})

	describe('encoding tricks and malformed prefixes', () => {
		it('rejects raw percent-encoded //evil.com (does not start with /)', () => {
			expect(sanitizeNextParam('%2F%2Fevil.com')).toBe('/workspace')
		})

		it('rejects the decoded form //evil.com', () => {
			expect(sanitizeNextParam('//evil.com')).toBe('/workspace')
		})

		it('rejects backslash prefix \\evil', () => {
			expect(sanitizeNextParam('\\evil')).toBe('/workspace')
		})

		it('rejects leading-space " /workspace"', () => {
			expect(sanitizeNextParam(' /workspace')).toBe('/workspace')
		})

		it('rejects bare hostname evil.com', () => {
			expect(sanitizeNextParam('evil.com')).toBe('/workspace')
		})
	})

	describe('colon handling: query strings vs path', () => {
		it('allows : inside the query string of a same-origin URL', () => {
			expect(sanitizeNextParam('/workspace?x=http://anything')).toBe('/workspace?x=http://anything')
		})

		it('allows : inside a query string value', () => {
			expect(sanitizeNextParam('/workspace?foo=bar:baz')).toBe('/workspace?foo=bar:baz')
		})

		it('rejects : in the path segment', () => {
			expect(sanitizeNextParam('/foo:bar')).toBe('/workspace')
		})
	})

	describe('mustStartWith option', () => {
		it('passes through /workspace/abc when mustStartWith is /workspace', () => {
			expect(sanitizeNextParam('/workspace/abc', { mustStartWith: '/workspace' })).toBe(
				'/workspace/abc',
			)
		})

		it('rejects /foo when mustStartWith is /workspace', () => {
			expect(sanitizeNextParam('/foo', { mustStartWith: '/workspace' })).toBe('/workspace')
		})

		it('passes through /workspace when mustStartWith is /workspace', () => {
			expect(sanitizeNextParam('/workspace', { mustStartWith: '/workspace' })).toBe('/workspace')
		})
	})
})
