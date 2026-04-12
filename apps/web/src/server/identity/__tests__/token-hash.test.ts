import { describe, expect, it } from 'vitest'
import { hashToken } from '../token-hash'

describe('hashToken', () => {
	it('returns the correct SHA-256 hex digest for a known test vector', () => {
		expect(hashToken('test')).toBe(
			'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
		)
	})

	it('returns a 64-character hex string', () => {
		expect(hashToken('anything')).toMatch(/^[a-f0-9]{64}$/)
	})

	it('produces different hashes for different tokens', () => {
		expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
	})

	it('produces the same hash for the same token (deterministic)', () => {
		expect(hashToken('same-token')).toBe(hashToken('same-token'))
	})
})
