import { NextResponse } from 'next/server'
import { authenticateSession } from './authenticate-session'

type AuthSuccess = { ok: true; userId: string; email: string; emailVerified: boolean }
type AuthFailure = { ok: false; response: NextResponse }
type AuthResult = AuthSuccess | AuthFailure

function unauthenticated(): AuthFailure {
	return {
		ok: false,
		response: NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		),
	}
}

function extractCookie(request: Request): string | null {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null
	const match = cookieHeader.match(/meldar-auth=([^;]+)/)
	return match ? match[1] : null
}

export async function requireAuth(request: Request): Promise<AuthResult> {
	const cookieValue = extractCookie(request)
	const result = await authenticateSession(cookieValue)
	if (result.state !== 'valid') return unauthenticated()
	return {
		ok: true,
		userId: result.session.userId,
		email: result.session.email,
		emailVerified: result.session.emailVerified,
	}
}
