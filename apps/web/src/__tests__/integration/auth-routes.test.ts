import { randomBytes } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/server/identity/password'
import { hashToken } from '@/server/identity/token-hash'
import { cleanupTestUser, createTestUser, db, HAS_DATABASE, testEmail, users } from './setup'

describe.skipIf(!HAS_DATABASE)('auth routes integration tests — real DB', () => {
	const idsToCleanup: string[] = []

	afterEach(async () => {
		for (const id of idsToCleanup) {
			await cleanupTestUser(id)
		}
		idsToCleanup.length = 0
	})

	describe('register flow', () => {
		it('inserts user with bcrypt-hashed password and retrieves by email', async () => {
			const email = testEmail()
			const passwordHash = await hashPassword('SecureP@ss123!')

			const [user] = await db()
				.insert(users)
				.values({ email, passwordHash, name: 'Register Test' })
				.returning()
			idsToCleanup.push(user.id)

			const [found] = await db().select().from(users).where(eq(users.email, email))

			expect(found).toBeDefined()
			expect(found.passwordHash).toMatch(/^\$2[ab]\$/)
			expect(await verifyPassword('SecureP@ss123!', found.passwordHash)).toBe(true)
			expect(await verifyPassword('wrong-password', found.passwordHash)).toBe(false)
		})
	})

	describe('login lookup', () => {
		it('selects exactly 1 row by email with eq()', async () => {
			const user = await createTestUser()
			idsToCleanup.push(user.id)

			const rows = await db().select().from(users).where(eq(users.email, user.email))

			expect(rows).toHaveLength(1)
			expect(rows[0].id).toBe(user.id)
		})
	})

	describe('forgot-password flow', () => {
		it('stores hashed reset token with expiry and retrieves by token + validity', async () => {
			const user = await createTestUser()
			idsToCleanup.push(user.id)

			const rawToken = randomBytes(32).toString('hex')
			const hashed = hashToken(rawToken)
			const expiresAt = new Date(Date.now() + 3600_000)

			await db()
				.update(users)
				.set({ resetToken: hashed, resetTokenExpiresAt: expiresAt })
				.where(eq(users.id, user.id))

			const [found] = await db()
				.select()
				.from(users)
				.where(and(eq(users.resetToken, hashed), gt(users.resetTokenExpiresAt, new Date())))

			expect(found).toBeDefined()
			expect(found.id).toBe(user.id)
		})
	})

	describe('reset-password atomic', () => {
		it('consumes reset token atomically — second UPDATE returns 0 rows', async () => {
			const user = await createTestUser()
			idsToCleanup.push(user.id)

			const rawToken = randomBytes(32).toString('hex')
			const hashed = hashToken(rawToken)
			const expiresAt = new Date(Date.now() + 3600_000)

			await db()
				.update(users)
				.set({ resetToken: hashed, resetTokenExpiresAt: expiresAt })
				.where(eq(users.id, user.id))

			const newHash = await hashPassword('NewP@ssword456!')

			const firstUpdate = await db()
				.update(users)
				.set({ passwordHash: newHash, resetToken: null, resetTokenExpiresAt: null })
				.where(eq(users.resetToken, hashed))
				.returning({ id: users.id })

			expect(firstUpdate).toHaveLength(1)
			expect(firstUpdate[0].id).toBe(user.id)

			const secondUpdate = await db()
				.update(users)
				.set({ passwordHash: newHash, resetToken: null, resetTokenExpiresAt: null })
				.where(eq(users.resetToken, hashed))
				.returning({ id: users.id })

			expect(secondUpdate).toHaveLength(0)
		})
	})

	describe('email verification', () => {
		it('verifies email via token lookup and marks emailVerified=true', async () => {
			const rawToken = randomBytes(32).toString('hex')
			const hashed = hashToken(rawToken)

			const [user] = await db()
				.insert(users)
				.values({
					email: testEmail(),
					passwordHash: 'placeholder',
					name: 'Verify Test',
					verifyToken: hashed,
					verifyTokenExpiresAt: new Date(Date.now() + 3600_000),
					emailVerified: false,
				})
				.returning()
			idsToCleanup.push(user.id)

			const [found] = await db().select().from(users).where(eq(users.verifyToken, hashed))

			expect(found).toBeDefined()
			expect(found.id).toBe(user.id)

			await db()
				.update(users)
				.set({ emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null })
				.where(eq(users.id, found.id))

			const [verified] = await db().select().from(users).where(eq(users.id, user.id))

			expect(verified.emailVerified).toBe(true)
			expect(verified.verifyToken).toBeNull()
			expect(verified.verifyTokenExpiresAt).toBeNull()
		})
	})

	describe('token version lifecycle', () => {
		it('increments tokenVersion from 0 → 1 → 2', async () => {
			const user = await createTestUser()
			idsToCleanup.push(user.id)

			expect(user.tokenVersion).toBe(0)

			await db()
				.update(users)
				.set({ tokenVersion: sql`${users.tokenVersion} + 1` })
				.where(eq(users.id, user.id))

			const [after1] = await db().select().from(users).where(eq(users.id, user.id))
			expect(after1.tokenVersion).toBe(1)

			await db()
				.update(users)
				.set({ tokenVersion: sql`${users.tokenVersion} + 1` })
				.where(eq(users.id, user.id))

			const [after2] = await db().select().from(users).where(eq(users.id, user.id))
			expect(after2.tokenVersion).toBe(2)
		})
	})

	describe('Google OAuth user creation', () => {
		it('inserts user with authProvider=google and emailVerified=true', async () => {
			const email = testEmail()

			const [user] = await db()
				.insert(users)
				.values({
					email,
					passwordHash: 'oauth-no-password',
					name: 'Google OAuth User',
					authProvider: 'google',
					emailVerified: true,
				})
				.returning()
			idsToCleanup.push(user.id)

			const [found] = await db().select().from(users).where(eq(users.id, user.id))

			expect(found.authProvider).toBe('google')
			expect(found.emailVerified).toBe(true)
			expect(found.email).toBe(email)
			expect(found.name).toBe('Google OAuth User')
			expect(found.tokenVersion).toBe(0)
		})
	})

	describe('duplicate email rejection', () => {
		it('throws unique constraint error on duplicate email insert', async () => {
			const email = testEmail()

			const [user] = await db()
				.insert(users)
				.values({ email, passwordHash: 'hash-1', name: 'First' })
				.returning()
			idsToCleanup.push(user.id)

			await expect(
				db().insert(users).values({ email, passwordHash: 'hash-2', name: 'Second' }).returning(),
			).rejects.toThrow()
		})
	})

	describe('session invalidation', () => {
		it('incrementing tokenVersion invalidates sessions holding the old version', async () => {
			const user = await createTestUser()
			idsToCleanup.push(user.id)

			const oldVersion = user.tokenVersion
			expect(oldVersion).toBe(0)

			await db()
				.update(users)
				.set({ tokenVersion: sql`${users.tokenVersion} + 1` })
				.where(eq(users.id, user.id))

			const [updated] = await db().select().from(users).where(eq(users.id, user.id))

			expect(updated.tokenVersion).not.toBe(oldVersion)
			expect(updated.tokenVersion).toBe(1)

			const sessionValid = updated.tokenVersion === oldVersion
			expect(sessionValid).toBe(false)
		})
	})
})
