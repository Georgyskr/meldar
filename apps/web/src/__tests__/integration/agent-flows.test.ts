import { and, eq } from 'drizzle-orm'
import {
	agentEvents,
	agentTasks,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
} from './setup'

describe.skipIf(!HAS_DATABASE)('agent flow integration tests — real DB', () => {
	describe('agent task full lifecycle', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('transitions proposed → approved → executing → verifying → done', async () => {
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
					payload: { query: 'lifecycle test' },
				})
				.returning()
			expect(task.status).toBe('proposed')

			const [approved] = await db()
				.update(agentTasks)
				.set({ status: 'approved', approvedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(approved.status).toBe('approved')
			expect(approved.approvedAt).toBeDefined()

			const [executing] = await db()
				.update(agentTasks)
				.set({ status: 'executing', executedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(executing.status).toBe('executing')
			expect(executing.executedAt).toBeDefined()

			const [verifying] = await db()
				.update(agentTasks)
				.set({ status: 'verifying', verifiedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(verifying.status).toBe('verifying')

			const [done] = await db()
				.update(agentTasks)
				.set({ status: 'done', result: { output: 'completed' } })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(done.status).toBe('done')
			expect(done.result).toEqual({ output: 'completed' })
		})
	})

	describe('query pending tasks', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts 3 proposed tasks and queries pending count', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			await db()
				.insert(agentTasks)
				.values([
					{ projectId, agentType: 'lead_research', status: 'proposed', payload: { n: 1 } },
					{ projectId, agentType: 'email_drip', status: 'proposed', payload: { n: 2 } },
					{ projectId, agentType: 'booking_confirmation', status: 'proposed', payload: { n: 3 } },
				])

			const pending = await db()
				.select()
				.from(agentTasks)
				.where(and(eq(agentTasks.projectId, projectId), eq(agentTasks.status, 'proposed')))

			expect(pending).toHaveLength(3)
		})
	})

	describe('agent event insertion', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts agent event and verifies shape', async () => {
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
					payload: { action: 'lead_research', detail: 'test' },
				})
				.returning()

			const events = await db()
				.select()
				.from(agentEvents)
				.where(eq(agentEvents.projectId, projectId))

			expect(events).toHaveLength(1)
			expect(events[0].id).toBe(event.id)
			expect(events[0].eventType).toBe('proposal')
			expect(events[0].payload).toEqual({ action: 'lead_research', detail: 'test' })
			expect(events[0].createdAt).toBeInstanceOf(Date)
		})
	})

	describe('agent task + event co-existence', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts task and event for same project and verifies both reference it', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [task] = await db()
				.insert(agentTasks)
				.values({
					projectId,
					agentType: 'email_drip',
					status: 'proposed',
					payload: { subject: 'test' },
				})
				.returning()

			const [event] = await db()
				.insert(agentEvents)
				.values({
					projectId,
					userId,
					eventType: 'proposal',
					payload: { taskId: task.id, action: 'email_drip' },
				})
				.returning()

			const [foundTask] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))
			const [foundEvent] = await db().select().from(agentEvents).where(eq(agentEvents.id, event.id))

			expect(foundTask.projectId).toBe(projectId)
			expect(foundEvent.projectId).toBe(projectId)
			expect((foundEvent.payload as { taskId: string }).taskId).toBe(task.id)
		})
	})
})
