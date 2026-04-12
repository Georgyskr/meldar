import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { verifyToken } from './jwt'

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

export async function requireAuth(request: Request): Promise<AuthResult> {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return unauthenticated()

	const match = cookieHeader.match(/meldar-auth=([^;]+)/)
	if (!match) return unauthenticated()

	const payload = verifyToken(match[1])
	if (!payload) return unauthenticated()

	const db = getDb()
	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			emailVerified: users.emailVerified,
			tokenVersion: users.tokenVersion,
		})
		.from(users)
		.where(eq(users.id, payload.userId))
		.limit(1)

	if (!user) return unauthenticated()
	if (user.tokenVersion !== payload.tokenVersion) return unauthenticated()

	return {
		ok: true,
		userId: user.id,
		email: user.email,
		emailVerified: user.emailVerified,
	}
}
