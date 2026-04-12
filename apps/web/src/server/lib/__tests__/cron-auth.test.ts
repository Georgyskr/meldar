import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyCronAuth } from '../cron-auth'

function makeRequest(authHeader?: string): Request {
	const headers = new Headers()
	if (authHeader !== undefined) {
		headers.set('authorization', authHeader)
	}
	return new Request('https://example.com/api/cron', { headers })
}

describe('verifyCronAuth', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('returns false when CRON_SECRET is empty string', () => {
		vi.stubEnv('CRON_SECRET', '')
		expect(verifyCronAuth(makeRequest('Bearer '))).toBe(false)
	})

	it('returns false when CRON_SECRET is shorter than 16 characters', () => {
		vi.stubEnv('CRON_SECRET', 'short')
		expect(verifyCronAuth(makeRequest('Bearer short'))).toBe(false)
	})

	it('returns false when CRON_SECRET is undefined', () => {
		delete process.env.CRON_SECRET
		expect(verifyCronAuth(makeRequest('Bearer anything'))).toBe(false)
	})

	it('returns false when authorization header is missing', () => {
		vi.stubEnv('CRON_SECRET', 'a-valid-secret-that-is-long-enough')
		expect(verifyCronAuth(makeRequest())).toBe(false)
	})

	it('returns false when authorization header does not match', () => {
		vi.stubEnv('CRON_SECRET', 'a-valid-secret-that-is-long-enough')
		expect(verifyCronAuth(makeRequest('Bearer wrong-secret-value-here'))).toBe(false)
	})

	it('returns true when authorization header matches Bearer + CRON_SECRET', () => {
		const secret = 'a-valid-secret-that-is-long-enough'
		vi.stubEnv('CRON_SECRET', secret)
		expect(verifyCronAuth(makeRequest(`Bearer ${secret}`))).toBe(true)
	})

	it('pads buffers to equal length before comparison (no length oracle)', () => {
		const secret = 'a-valid-secret-that-is-long-enough'
		vi.stubEnv('CRON_SECRET', secret)
		const wrongLength = 'Bearer x'
		expect(verifyCronAuth(makeRequest(wrongLength))).toBe(false)
	})
})
