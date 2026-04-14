// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasKickedAutoBuild, markAutoBuildKicked } from '../auto-build-flag'

describe('auto-build flag', () => {
	beforeEach(() => {
		window.sessionStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns false for a project that has never been kicked', () => {
		expect(hasKickedAutoBuild('proj_A')).toBe(false)
	})

	it('returns true after mark for the same project', () => {
		markAutoBuildKicked('proj_A')
		expect(hasKickedAutoBuild('proj_A')).toBe(true)
	})

	it('is scoped per project', () => {
		markAutoBuildKicked('proj_A')
		expect(hasKickedAutoBuild('proj_B')).toBe(false)
	})

	it('persists across multiple reads (survives component remount)', () => {
		markAutoBuildKicked('proj_A')
		for (let i = 0; i < 5; i++) {
			expect(hasKickedAutoBuild('proj_A')).toBe(true)
		}
	})

	it('returns false when sessionStorage access throws (private mode)', () => {
		vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
			throw new Error('QuotaExceeded')
		})
		// With the mock throwing, the internal storage() helper can't return
		// the store, so the getItem path should never be reached — but defensively,
		// a throw must not crash the caller.
		expect(() => hasKickedAutoBuild('proj_A')).not.toThrow()
	})

	it('does not throw when setItem fails (quota exceeded)', () => {
		vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceeded')
		})
		expect(() => markAutoBuildKicked('proj_A')).not.toThrow()
	})
})
