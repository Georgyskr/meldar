import { eq, sql } from 'drizzle-orm'
import {
	aiCallLog,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	tokenTransactions,
	users,
} from './setup'

describe.skipIf(!HAS_DATABASE)('billing flow integration tests — real DB', () => {
	describe('token balance debit/credit', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('debits and credits token balance correctly', async () => {
			const user = await createTestUser()
			userId = user.id
			expect(user.tokenBalance).toBe(200)

			const [debited] = await db()
				.update(users)
				.set({ tokenBalance: sql`${users.tokenBalance} - 50` })
				.where(eq(users.id, userId))
				.returning()
			expect(debited.tokenBalance).toBe(150)

			const [credited] = await db()
				.update(users)
				.set({ tokenBalance: sql`${users.tokenBalance} + 25` })
				.where(eq(users.id, userId))
				.returning()
			expect(credited.tokenBalance).toBe(175)
		})
	})

	describe('token transaction log', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts token transaction and verifies shape', async () => {
			const user = await createTestUser()
			userId = user.id

			const [txn] = await db()
				.insert(tokenTransactions)
				.values({
					userId,
					amount: -50,
					reason: 'build',
					balanceAfter: 150,
					referenceId: 'build-xyz-123',
				})
				.returning()

			const [found] = await db()
				.select()
				.from(tokenTransactions)
				.where(eq(tokenTransactions.id, txn.id))

			expect(found.userId).toBe(userId)
			expect(found.amount).toBe(-50)
			expect(found.reason).toBe('build')
			expect(found.balanceAfter).toBe(150)
			expect(found.referenceId).toBe('build-xyz-123')
			expect(found.createdAt).toBeInstanceOf(Date)
		})
	})

	describe('AI call logging', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts ai call log entry and verifies kind, model, tokens', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [entry] = await db()
				.insert(aiCallLog)
				.values({
					userId,
					projectId,
					kind: 'build',
					model: 'claude-sonnet-4-6',
					inputTokens: 1200,
					outputTokens: 800,
					cachedReadTokens: 400,
					cachedWriteTokens: 0,
					centsCharged: 3,
					latencyMs: 2500,
					status: 'ok',
					stopReason: 'end_turn',
				})
				.returning()

			const results = await db()
				.select()
				.from(aiCallLog)
				.where(eq(aiCallLog.userId, userId))

			expect(results).toHaveLength(1)
			expect(results[0].id).toBe(entry.id)
			expect(results[0].kind).toBe('build')
			expect(results[0].model).toBe('claude-sonnet-4-6')
			expect(results[0].inputTokens).toBe(1200)
			expect(results[0].outputTokens).toBe(800)
			expect(results[0].cachedReadTokens).toBe(400)
			expect(results[0].centsCharged).toBe(3)
			expect(results[0].latencyMs).toBe(2500)
			expect(results[0].status).toBe('ok')
			expect(results[0].projectId).toBe(projectId)
		})
	})

	describe('non-negative balance constraint', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('throws CHECK constraint when balance would go negative', async () => {
			const user = await createTestUser()
			userId = user.id

			await db()
				.update(users)
				.set({ tokenBalance: 10 })
				.where(eq(users.id, userId))

			await expect(
				db()
					.update(users)
					.set({ tokenBalance: sql`${users.tokenBalance} - 50` })
					.where(eq(users.id, userId)),
			).rejects.toThrow()
		})
	})
})
