import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('Password utilities', () => {
	it('hashes a password and verifies it correctly', async () => {
		const password = 'my-secure-password-123'
		const hash = await hashPassword(password)

		expect(hash).not.toBe(password)
		expect(hash).toMatch(/^\$2[aby]?\$/) // bcrypt hash format

		const isValid = await verifyPassword(password, hash)
		expect(isValid).toBe(true)
	})

	it('returns false for incorrect password', async () => {
		const hash = await hashPassword('correct-password')
		const isValid = await verifyPassword('wrong-password', hash)
		expect(isValid).toBe(false)
	})

	it('generates different hashes for the same password (salt)', async () => {
		const password = 'same-password'
		const hash1 = await hashPassword(password)
		const hash2 = await hashPassword(password)

		expect(hash1).not.toBe(hash2)

		// Both should still verify
		expect(await verifyPassword(password, hash1)).toBe(true)
		expect(await verifyPassword(password, hash2)).toBe(true)
	})

	it('handles empty string password', async () => {
		const hash = await hashPassword('')
		expect(await verifyPassword('', hash)).toBe(true)
		expect(await verifyPassword('not-empty', hash)).toBe(false)
	})
})
