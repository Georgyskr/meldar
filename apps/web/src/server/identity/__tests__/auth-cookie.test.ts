import { NextResponse } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setAuthCookie } from '../auth-cookie'

describe('setAuthCookie', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('sets meldar-auth cookie with correct flags', () => {
		const response = NextResponse.json({ ok: true })
		setAuthCookie(response, 'test-token')

		const setCookie = response.headers.get('set-cookie')
		expect(setCookie).toContain('meldar-auth=test-token')
		expect(setCookie).toContain('HttpOnly')
		expect(setCookie?.toLowerCase()).toContain('samesite=strict')
		expect(setCookie).toContain('Max-Age=604800')
		expect(setCookie).toContain('Path=/')
	})

	it('sets Secure flag in production', () => {
		vi.stubEnv('NODE_ENV', 'production')
		const response = NextResponse.json({ ok: true })
		setAuthCookie(response, 'test-token')

		const setCookie = response.headers.get('set-cookie')
		expect(setCookie).toContain('Secure')
	})

	it('omits Secure flag in development', () => {
		vi.stubEnv('NODE_ENV', 'development')
		const response = NextResponse.json({ ok: true })
		setAuthCookie(response, 'test-token')

		const setCookie = response.headers.get('set-cookie')
		expect(setCookie).not.toContain('Secure')
	})
})
