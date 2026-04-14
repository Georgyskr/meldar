import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { verifyToken } from './jwt'

export type ValidSession = {
	userId: string
	email: string
	emailVerified: boolean
	tokenVersion: number
}

export type AuthResult =
	| { state: 'valid'; session: ValidSession }
	| { state: 'stale' }
	| { state: 'invalid' }

export async function authenticateSession(
	cookieValue: string | null | undefined,
): Promise<AuthResult> {
	if (!cookieValue) return { state: 'invalid' }
	const payload = verifyToken(cookieValue)
	if (!payload) return { state: 'invalid' }

	const [user] = await getDb()
		.select({
			tokenVersion: users.tokenVersion,
			email: users.email,
			emailVerified: users.emailVerified,
		})
		.from(users)
		.where(eq(users.id, payload.userId))
		.limit(1)

	if (!user || user.tokenVersion !== payload.tokenVersion) {
		console.warn(
			`[auth] rejecting stale session for userId=${payload.userId} (tokenVersion invalidation)`,
		)
		return { state: 'stale' }
	}

	return {
		state: 'valid',
		session: {
			userId: payload.userId,
			email: user.email,
			emailVerified: user.emailVerified,
			tokenVersion: user.tokenVersion,
		},
	}
}
