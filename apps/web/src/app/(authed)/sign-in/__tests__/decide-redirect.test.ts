import { describe, expect, it } from 'vitest'
import type { AuthResult } from '@/server/identity/authenticate-session'
import { decideSignInRedirect } from '../decide-redirect'

const validAuth: AuthResult = {
	state: 'valid',
	session: {
		userId: 'u1',
		email: 'u@example.com',
		emailVerified: true,
		tokenVersion: 1,
	},
}

describe('decideSignInRedirect', () => {
	it('redirects valid sessions to /workspace by default', () => {
		expect(decideSignInRedirect(validAuth, {})).toEqual({ kind: 'redirect', to: '/workspace' })
	})

	it('honours safe /workspace next param for valid sessions', () => {
		expect(decideSignInRedirect(validAuth, { next: '/workspace/projects/abc' })).toEqual({
			kind: 'redirect',
			to: '/workspace/projects/abc',
		})
	})

	it('rejects open-redirect next values for valid sessions', () => {
		expect(decideSignInRedirect(validAuth, { next: '//evil.com' })).toEqual({
			kind: 'redirect',
			to: '/workspace',
		})
		expect(decideSignInRedirect(validAuth, { next: 'https://evil.com' })).toEqual({
			kind: 'redirect',
			to: '/workspace',
		})
	})

	it('renders form (no redirect) for invalid auth — the redirect-loop guard', () => {
		expect(decideSignInRedirect({ state: 'invalid' }, {})).toEqual({
			kind: 'render',
			errorMessage: null,
		})
	})

	it('renders form (no redirect) for stale auth — the exact regression scenario', () => {
		expect(decideSignInRedirect({ state: 'stale' }, { error: 'session-expired' })).toEqual({
			kind: 'render',
			errorMessage: 'Your session expired. Please sign in again.',
		})
	})

	it('ignores unknown error codes (null message) but still renders', () => {
		expect(decideSignInRedirect({ state: 'invalid' }, { error: 'what-is-this' })).toEqual({
			kind: 'render',
			errorMessage: null,
		})
	})

	it('never redirects a stale session even if a next param is provided', () => {
		// Prevents a flavour of the loop where a stale user with ?next=/workspace
		// somehow gets bounced back into /workspace by accident.
		expect(
			decideSignInRedirect({ state: 'stale' }, { next: '/workspace/sensitive' }),
		).toMatchObject({ kind: 'render' })
	})
})
