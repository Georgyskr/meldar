import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export async function GET() {
	const clientId = process.env.GOOGLE_CLIENT_ID
	if (!clientId) {
		return NextResponse.json(
			{ error: { code: 'CONFIG_ERROR', message: 'Google OAuth not configured' } },
			{ status: 503 },
		)
	}

	const state = crypto.randomUUID()
	const cookieStore = await cookies()
	cookieStore.set('oauth_state', state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 600,
		path: '/',
	})

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://meldar.ai'}/api/auth/google/callback`,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'online',
		prompt: 'select_account',
		state,
	})

	return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
}
