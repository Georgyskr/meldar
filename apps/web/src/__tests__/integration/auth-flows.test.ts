import { createHash, randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import {
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	projects,
	users,
} from './setup'

describe.skipIf(!HAS_DATABASE)('auth flow integration tests — real DB', () => {
	describe('password hashing round-trip', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('creates user with hashed password and verifies it matches', async () => {
			const rawPassword = 'test-secret-password-123'
			const hashed = createHash('sha256').update(rawPassword).digest('hex')

			const [user] = await db()
				.insert(users)
				.values({
					email: `auth-test-${randomBytes(4).toString('hex')}@meldar-test.local`,
					passwordHash: hashed,
					name: 'Auth Test User',
				})
				.returning()
			userId = user.id

			const [found] = await db().select().from(users).where(eq(users.id, userId))
			const rehashed = createHash('sha256').update(rawPassword).digest('hex')
			expect(found.passwordHash).toBe(rehashed)
		})
	})

	describe('reset token lookup', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('creates user with reset token and queries by hashed token', async () => {
			const user = await createTestUser()
			userId = user.id

			const rawToken = randomBytes(32).toString('hex')
			const hashedToken = createHash('sha256').update(rawToken).digest('hex')
			const expiresAt = new Date(Date.now() + 3600_000)

			await db()
				.update(users)
				.set({ resetToken: hashedToken, resetTokenExpiresAt: expiresAt })
				.where(eq(users.id, userId))

			const [found] = await db().select().from(users).where(eq(users.resetToken, hashedToken))

			expect(found).toBeDefined()
			expect(found.id).toBe(userId)
			expect(found.resetTokenExpiresAt).toBeDefined()
		})
	})

	describe('tokenVersion increment', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('increments tokenVersion and verifies old version does not match', async () => {
			const user = await createTestUser()
			userId = user.id

			const originalVersion = user.tokenVersion

			await db()
				.update(users)
				.set({ tokenVersion: originalVersion + 1 })
				.where(eq(users.id, userId))

			const [updated] = await db().select().from(users).where(eq(users.id, userId))
			expect(updated.tokenVersion).toBe(originalVersion + 1)
			expect(updated.tokenVersion).not.toBe(originalVersion)
		})
	})

	describe('project ownership', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('verifies project ownership returns the project for correct user', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)
			projectId = project.id

			const owned = await db()
				.select()
				.from(projects)
				.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

			expect(owned).toHaveLength(1)
			expect(owned[0].id).toBe(projectId)
		})
	})

	describe('project ownership denied', () => {
		let userId: string
		let otherUserId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (otherUserId) await cleanupTestUser(otherUserId)
			if (userId) await cleanupTestUser(userId)
		})

		it('verifies different userId returns empty (ownership denied)', async () => {
			const user = await createTestUser()
			userId = user.id

			const otherUser = await createTestUser()
			otherUserId = otherUser.id

			const project = await createTestProject(userId)
			projectId = project.id

			const denied = await db()
				.select()
				.from(projects)
				.where(and(eq(projects.id, projectId), eq(projects.userId, otherUserId)))

			expect(denied).toHaveLength(0)
		})
	})
})
