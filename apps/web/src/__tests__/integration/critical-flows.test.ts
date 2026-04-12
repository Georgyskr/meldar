import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import {
	agentTasks,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	projectDomains,
	projects,
} from './setup'

describe.skipIf(!HAS_DATABASE)('critical flow smoke tests — real DB', () => {
	describe('user → project → load', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('creates user, creates project, verifies project loads with userId filter', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)
			projectId = project.id

			const userProjects = await db().select().from(projects).where(eq(projects.userId, userId))

			expect(userProjects).toHaveLength(1)
			expect(userProjects[0].id).toBe(projectId)
			expect(userProjects[0].name).toBe('Integration Test Project')
		})
	})

	describe('user → project → agent task → query pending', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts agent task and queries by project + status', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)
			projectId = project.id

			const [task] = await db()
				.insert(agentTasks)
				.values({
					projectId,
					agentType: 'lead_research',
					status: 'proposed',
					payload: { query: 'test lead' },
				})
				.returning()

			const pendingTasks = await db()
				.select()
				.from(agentTasks)
				.where(and(eq(agentTasks.projectId, projectId), eq(agentTasks.status, 'proposed')))

			expect(pendingTasks).toHaveLength(1)
			expect(pendingTasks[0].id).toBe(task.id)
			expect(pendingTasks[0].agentType).toBe('lead_research')
		})
	})

	describe('user → project → domain → query active', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts project domain and queries active domains', async () => {
			const user = await createTestUser()
			userId = user.id

			const project = await createTestProject(userId)
			projectId = project.id

			const domain = `test-${randomUUID().slice(0, 8)}.meldar.app`
			await db().insert(projectDomains).values({
				projectId,
				type: 'subdomain',
				domain,
				state: 'active',
			})

			const activeDomains = await db()
				.select()
				.from(projectDomains)
				.where(and(eq(projectDomains.projectId, projectId), eq(projectDomains.state, 'active')))

			expect(activeDomains).toHaveLength(1)
			expect(activeDomains[0].domain).toBe(domain)
			expect(activeDomains[0].type).toBe('subdomain')
		})
	})
})
