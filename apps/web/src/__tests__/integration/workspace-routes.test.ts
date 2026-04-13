import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import {
	buildFiles,
	builds,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	kanbanCards,
	projectFiles,
	projects,
	tokenTransactions,
} from './setup'

describe.skipIf(!HAS_DATABASE)('workspace routes — real DB', () => {
	describe('project CRUD', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('create user → create project → list by userId → verify count=1', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)

			const userProjects = await db().select().from(projects).where(eq(projects.userId, userId))

			expect(userProjects).toHaveLength(1)
			expect(userProjects[0].id).toBe(project.id)
			expect(userProjects[0].name).toBe('Integration Test Project')
		})
	})

	describe('project with template', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('stores templateId correctly', async () => {
			const user = await createTestUser()
			userId = user.id

			const [project] = await db()
				.insert(projects)
				.values({
					userId,
					name: 'Booking App',
					templateId: 'booking-page',
				})
				.returning()
			projectId = project.id

			const [found] = await db().select().from(projects).where(eq(projects.id, projectId))

			expect(found.templateId).toBe('booking-page')
		})
	})

	describe('kanban cards', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts parent + children and verifies parentId relationships', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [parent] = await db()
				.insert(kanbanCards)
				.values({
					projectId,
					position: 0,
					title: 'Parent Card',
					taskType: 'feature',
				})
				.returning()

			await db()
				.insert(kanbanCards)
				.values([
					{
						projectId,
						parentId: parent.id,
						position: 0,
						title: 'Child Card 1',
						taskType: 'page',
					},
					{
						projectId,
						parentId: parent.id,
						position: 1,
						title: 'Child Card 2',
						taskType: 'fix',
					},
				])

			const cards = await db()
				.select()
				.from(kanbanCards)
				.where(eq(kanbanCards.projectId, projectId))

			expect(cards).toHaveLength(3)

			const parentCard = cards.find((c) => c.id === parent.id)
			const children = cards.filter((c) => c.parentId === parent.id)

			expect(parentCard).toBeDefined()
			expect(parentCard?.parentId).toBeNull()
			expect(children).toHaveLength(2)
			expect(children.map((c) => c.title).sort()).toEqual(['Child Card 1', 'Child Card 2'])
		})
	})

	describe('build lifecycle', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('streaming → completed sets completedAt', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [build] = await db()
				.insert(builds)
				.values({
					projectId,
					status: 'streaming',
					triggeredBy: 'user_prompt',
				})
				.returning()

			expect(build.completedAt).toBeNull()

			await db()
				.update(builds)
				.set({ status: 'completed', completedAt: sql`now()` })
				.where(eq(builds.id, build.id))

			const [updated] = await db().select().from(builds).where(eq(builds.id, build.id))

			expect(updated.status).toBe('completed')
			expect(updated.completedAt).not.toBeNull()
			expect(updated.completedAt).toBeInstanceOf(Date)
		})
	})

	describe('build files', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts build file and verifies shape', async () => {
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

			await db()
				.insert(buildFiles)
				.values({
					buildId: build.id,
					path: '/src/app.tsx',
					r2Key: `projects/${projectId}/content/sha256hash`,
					contentHash: 'sha256hash',
					sizeBytes: 4096,
				})

			const files = await db().select().from(buildFiles).where(eq(buildFiles.buildId, build.id))

			expect(files).toHaveLength(1)
			expect(files[0].path).toBe('/src/app.tsx')
			expect(files[0].contentHash).toBe('sha256hash')
			expect(files[0].sizeBytes).toBe(4096)
			expect(files[0].r2Key).toContain(projectId)
		})
	})

	describe('project files upsert', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('updates same (projectId, path) with new contentHash and increments version', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [pf] = await db()
				.insert(projectFiles)
				.values({
					projectId,
					path: '/index.html',
					r2Key: `projects/${projectId}/content/hash_v1`,
					contentHash: 'hash_v1',
					sizeBytes: 100,
					version: 1,
				})
				.returning()

			expect(pf.version).toBe(1)

			await db()
				.update(projectFiles)
				.set({
					contentHash: 'hash_v2',
					r2Key: `projects/${projectId}/content/hash_v2`,
					sizeBytes: 200,
					version: sql`${projectFiles.version} + 1`,
					updatedAt: sql`now()`,
				})
				.where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, '/index.html')))

			const [updated] = await db().select().from(projectFiles).where(eq(projectFiles.id, pf.id))

			expect(updated.contentHash).toBe('hash_v2')
			expect(updated.version).toBe(2)
			expect(updated.sizeBytes).toBe(200)
		})
	})

	describe('token transactions', () => {
		let userId: string

		afterEach(async () => {
			if (userId) await cleanupTestUser(userId)
		})

		it('debit + credit ordered by createdAt', async () => {
			const user = await createTestUser()
			userId = user.id

			await db().insert(tokenTransactions).values({
				userId,
				amount: -50,
				reason: 'build',
				balanceAfter: 150,
			})

			await db().insert(tokenTransactions).values({
				userId,
				amount: 25,
				reason: 'refund',
				balanceAfter: 175,
			})

			const txns = await db()
				.select()
				.from(tokenTransactions)
				.where(eq(tokenTransactions.userId, userId))
				.orderBy(asc(tokenTransactions.createdAt))

			expect(txns).toHaveLength(2)
			expect(txns[0].amount).toBe(-50)
			expect(txns[0].reason).toBe('build')
			expect(txns[1].amount).toBe(25)
			expect(txns[1].reason).toBe('refund')
		})
	})

	describe('project wishes (settings)', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('JSONB round-trips correctly', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const wishes = {
				theme: 'dark',
				pages: ['home', 'about', 'contact'],
				features: { analytics: true, blog: false },
			}

			await db().update(projects).set({ wishes }).where(eq(projects.id, projectId))

			const [found] = await db().select().from(projects).where(eq(projects.id, projectId))

			expect(found.wishes).toEqual(wishes)
		})
	})

	describe('soft delete', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('soft-deleted project excluded from WHERE deletedAt IS NULL', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			await db().update(projects).set({ deletedAt: sql`now()` }).where(eq(projects.id, projectId))

			const active = await db()
				.select()
				.from(projects)
				.where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))

			expect(active).toHaveLength(0)
		})
	})

	describe('multi-project isolation', () => {
		let userAId: string
		let userBId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userAId) await cleanupTestUser(userAId)
			if (userBId) await cleanupTestUser(userBId)
		})

		it('user B cannot see user A projects', async () => {
			const userA = await createTestUser()
			userAId = userA.id

			const userB = await createTestUser()
			userBId = userB.id

			const project = await createTestProject(userAId)
			projectId = project.id

			const userBProjects = await db()
				.select()
				.from(projects)
				.where(and(eq(projects.userId, userBId), isNull(projects.deletedAt)))

			expect(userBProjects).toHaveLength(0)
		})
	})
})
