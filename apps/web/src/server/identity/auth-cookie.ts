import type { NextResponse } from 'next/server'

const COOKIE_NAME = 'meldar-auth'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function setAuthCookie(response: NextResponse, token: string): void {
	response.cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: MAX_AGE_SECONDS,
		path: '/',
	})
}
