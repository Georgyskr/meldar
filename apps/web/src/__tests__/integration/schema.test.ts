import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { afterEach, describe, expect, it } from 'vitest'
import {
	agentEvents,
	agentTasks,
	aiCallLog,
	auditOrders,
	buildFiles,
	builds,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	deploymentLog,
	discoverySessions,
	HAS_DATABASE,
	kanbanCards,
	projectDomains,
	projectFiles,
	projects,
	subscribers,
	testEmail,
	tokenTransactions,
	users,
	xrayResults,
} from './setup'

describe.skipIf(!HAS_DATABASE)('schema smoke tests — real DB', () => {
	describe('users', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id

			const [found] = await db().select().from(users).where(eq(users.id, userId))
			expect(found).toBeDefined()
			expect(found.email).toContain('@meldar-test.local')
			expect(found.tokenBalance).toBe(200)

			await cleanupTestUser(userId)
			const [gone] = await db().select().from(users).where(eq(users.id, userId))
			expect(gone).toBeUndefined()
			userId = ''
		})
	})

	describe('projects', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)
			projectId = project.id

			const [found] = await db().select().from(projects).where(eq(projects.id, projectId))
			expect(found).toBeDefined()
			expect(found.name).toBe('Integration Test Project')
			expect(found.templateId).toBe('test-template-v1')
		})
	})

	describe('builds', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [build] = await db()
				.insert(builds)
				.values({
					projectId,
					status: 'completed',
					triggeredBy: 'template',
				})
				.returning()

			const [found] = await db().select().from(builds).where(eq(builds.id, build.id))
			expect(found).toBeDefined()
			expect(found.status).toBe('completed')
			expect(found.triggeredBy).toBe('template')
		})
	})

	describe('buildFiles', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [build] = await db()
				.insert(builds)
				.values({ projectId, status: 'completed', triggeredBy: 'template' })
				.returning()

			await db()
				.insert(buildFiles)
				.values({
					buildId: build.id,
					path: '/index.html',
					r2Key: `projects/${projectId}/content/abc123`,
					contentHash: 'abc123',
					sizeBytes: 100,
				})

			const [found] = await db()
				.select()
				.from(buildFiles)
				.where(and(eq(buildFiles.buildId, build.id), eq(buildFiles.path, '/index.html')))
			expect(found).toBeDefined()
			expect(found.contentHash).toBe('abc123')
			expect(found.sizeBytes).toBe(100)
		})
	})

	describe('projectFiles', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [pf] = await db()
				.insert(projectFiles)
				.values({
					projectId,
					path: '/app.tsx',
					r2Key: `projects/${projectId}/content/def456`,
					contentHash: 'def456',
					sizeBytes: 200,
				})
				.returning()

			const [found] = await db().select().from(projectFiles).where(eq(projectFiles.id, pf.id))
			expect(found).toBeDefined()
			expect(found.path).toBe('/app.tsx')
		})
	})

	describe('kanbanCards', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [card] = await db()
				.insert(kanbanCards)
				.values({
					projectId,
					position: 0,
					title: 'Test Card',
					taskType: 'feature',
				})
				.returning()

			const [found] = await db().select().from(kanbanCards).where(eq(kanbanCards.id, card.id))
			expect(found).toBeDefined()
			expect(found.title).toBe('Test Card')
			expect(found.state).toBe('draft')
		})
	})

	describe('tokenTransactions', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id

			const [txn] = await db()
				.insert(tokenTransactions)
				.values({
					userId,
					amount: -10,
					reason: 'build',
					balanceAfter: 190,
				})
				.returning()

			const [found] = await db()
				.select()
				.from(tokenTransactions)
				.where(eq(tokenTransactions.id, txn.id))
			expect(found).toBeDefined()
			expect(found.amount).toBe(-10)
			expect(found.reason).toBe('build')
		})
	})

	describe('aiCallLog', () => {
		let logId: string

		afterEach(async () => {
			if (logId) await db().delete(aiCallLog).where(eq(aiCallLog.id, logId))
		})

		it('insert + select + delete', async () => {
			const [entry] = await db()
				.insert(aiCallLog)
				.values({
					kind: 'build',
					model: 'claude-sonnet-4-6',
					inputTokens: 100,
					outputTokens: 50,
					status: 'ok',
				})
				.returning()
			logId = entry.id

			const [found] = await db().select().from(aiCallLog).where(eq(aiCallLog.id, logId))
			expect(found).toBeDefined()
			expect(found.kind).toBe('build')
			expect(found.model).toBe('claude-sonnet-4-6')
		})
	})

	describe('deploymentLog', () => {
		let logId: string

		afterEach(async () => {
			if (logId) await db().delete(deploymentLog).where(eq(deploymentLog.id, logId))
		})

		it('insert + select + delete', async () => {
			const [entry] = await db()
				.insert(deploymentLog)
				.values({
					status: 'ready',
					slug: 'test-deploy',
					url: 'https://test.vercel.app',
				})
				.returning()
			logId = entry.id

			const [found] = await db().select().from(deploymentLog).where(eq(deploymentLog.id, logId))
			expect(found).toBeDefined()
			expect(found.status).toBe('ready')
			expect(found.slug).toBe('test-deploy')
		})
	})

	describe('agentEvents', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [event] = await db()
				.insert(agentEvents)
				.values({
					projectId,
					userId,
					eventType: 'proposal',
					payload: { action: 'test' },
				})
				.returning()

			const [found] = await db().select().from(agentEvents).where(eq(agentEvents.id, event.id))
			expect(found).toBeDefined()
			expect(found.eventType).toBe('proposal')
		})
	})

	describe('agentTasks', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [task] = await db()
				.insert(agentTasks)
				.values({
					projectId,
					agentType: 'booking_confirmation',
					payload: { test: true },
				})
				.returning()

			const [found] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))
			expect(found).toBeDefined()
			expect(found.agentType).toBe('booking_confirmation')
			expect(found.status).toBe('proposed')
		})
	})

	describe('projectDomains', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('insert + select + delete', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const domain = `test-${randomUUID().slice(0, 8)}.meldar.app`
			const [pd] = await db()
				.insert(projectDomains)
				.values({
					projectId,
					type: 'subdomain',
					domain,
					state: 'active',
				})
				.returning()

			const [found] = await db().select().from(projectDomains).where(eq(projectDomains.id, pd.id))
			expect(found).toBeDefined()
			expect(found.domain).toBe(domain)
			expect(found.type).toBe('subdomain')
			expect(found.state).toBe('active')
		})
	})

	describe('xrayResults', () => {
		let xrayId: string

		afterEach(async () => {
			if (xrayId) await db().delete(xrayResults).where(eq(xrayResults.id, xrayId))
		})

		it('insert + select + delete', async () => {
			xrayId = nanoid(12)
			const [_xray] = await db()
				.insert(xrayResults)
				.values({
					id: xrayId,
					apps: [{ name: 'Instagram', usageMinutes: 120, category: 'social' }],
					totalHours: 2,
					topApp: 'Instagram',
					insight: 'Test insight',
				})
				.returning()

			const [found] = await db().select().from(xrayResults).where(eq(xrayResults.id, xrayId))
			expect(found).toBeDefined()
			expect(found.topApp).toBe('Instagram')
			expect(found.totalHours).toBe(2)
		})
	})

	describe('auditOrders', () => {
		let orderId: string

		afterEach(async () => {
			if (orderId) await db().delete(auditOrders).where(eq(auditOrders.id, orderId))
		})

		it('insert + select + delete', async () => {
			const [order] = await db()
				.insert(auditOrders)
				.values({
					email: testEmail(),
					stripeCheckoutSessionId: `cs_test_${randomUUID()}`,
					product: 'time_audit',
					amountCents: 2900,
				})
				.returning()
			orderId = order.id

			const [found] = await db().select().from(auditOrders).where(eq(auditOrders.id, orderId))
			expect(found).toBeDefined()
			expect(found.product).toBe('time_audit')
			expect(found.amountCents).toBe(2900)
			expect(found.currency).toBe('eur')
		})
	})

	describe('subscribers', () => {
		let subId: string

		afterEach(async () => {
			if (subId) await db().delete(subscribers).where(eq(subscribers.id, subId))
		})

		it('insert + select + delete', async () => {
			const [sub] = await db()
				.insert(subscribers)
				.values({
					email: testEmail(),
					source: 'landing',
				})
				.returning()
			subId = sub.id

			const [found] = await db().select().from(subscribers).where(eq(subscribers.id, subId))
			expect(found).toBeDefined()
			expect(found.source).toBe('landing')
		})
	})

	describe('discoverySessions', () => {
		let sessionId: string

		afterEach(async () => {
			if (sessionId) await db().delete(discoverySessions).where(eq(discoverySessions.id, sessionId))
		})

		it('insert + select + delete', async () => {
			sessionId = nanoid(16)
			const [_session] = await db()
				.insert(discoverySessions)
				.values({
					id: sessionId,
					email: testEmail(),
					occupation: 'developer',
				})
				.returning()

			const [found] = await db()
				.select()
				.from(discoverySessions)
				.where(eq(discoverySessions.id, sessionId))
			expect(found).toBeDefined()
			expect(found.occupation).toBe('developer')
		})
	})
})
