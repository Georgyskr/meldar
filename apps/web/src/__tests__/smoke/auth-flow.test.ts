import { signToken } from '@/server/identity/jwt'
import { HAS_AUTH, HAS_DATABASE } from './setup'

describe.skipIf(!HAS_AUTH || !HAS_DATABASE)('auth smoke — requireAuth with real DB', () => {
	it('signs a JWT, builds a Request with cookie, and calls requireAuth', async () => {
		const { getDb } = await import('@meldar/db/client')
		const { users } = await import('@meldar/db/schema')
		const { requireAuth } = await import('@/server/identity/require-auth')
		const { eq } = await import('drizzle-orm')
		const { randomUUID } = await import('node:crypto')

		const db = getDb()
		const email = `smoke-auth-${randomUUID()}@meldar-test.local`

		const [user] = await db
			.insert(users)
			.values({ email, passwordHash: 'not-used', name: 'Smoke Auth' })
			.returning()

		try {
			const token = signToken({
				userId: user.id,
				email: user.email,
				emailVerified: user.emailVerified,
				tokenVersion: user.tokenVersion,
			})

			const request = new Request('https://meldar.ai/api/test', {
				headers: { cookie: `meldar-auth=${token}` },
			})

			const result = await requireAuth(request)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.userId).toBe(user.id)
				expect(result.email).toBe(email)
			}
		} finally {
			await db.delete(users).where(eq(users.id, user.id))
		}
	})

	it('rejects JWT with wrong tokenVersion', async () => {
		const { getDb } = await import('@meldar/db/client')
		const { users } = await import('@meldar/db/schema')
		const { requireAuth } = await import('@/server/identity/require-auth')
		const { eq } = await import('drizzle-orm')
		const { randomUUID } = await import('node:crypto')

		const db = getDb()
		const email = `smoke-version-${randomUUID()}@meldar-test.local`

		const [user] = await db
			.insert(users)
			.values({ email, passwordHash: 'not-used', name: 'Smoke Version' })
			.returning()

		try {
			const token = signToken({
				userId: user.id,
				email: user.email,
				emailVerified: user.emailVerified,
				tokenVersion: 999,
			})

			const request = new Request('https://meldar.ai/api/test', {
				headers: { cookie: `meldar-auth=${token}` },
			})

			const result = await requireAuth(request)

			expect(result.ok).toBe(false)
		} finally {
			await db.delete(users).where(eq(users.id, user.id))
		}
	})
})
