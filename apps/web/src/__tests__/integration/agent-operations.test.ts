import { asc, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import {
	agentEvents,
	agentTasks,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	projects,
} from './setup'

describe.skipIf(!HAS_DATABASE)('agent operations integration tests — real DB', () => {
	describe('agent task state machine (full)', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('transitions proposed → approved → executing → verifying → done with all timestamps', async () => {
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
					payload: { query: 'full state machine' },
				})
				.returning()
			expect(task.status).toBe('proposed')
			expect(task.proposedAt).toBeInstanceOf(Date)

			const [approved] = await db()
				.update(agentTasks)
				.set({ status: 'approved', approvedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(approved.status).toBe('approved')
			expect(approved.approvedAt).toBeInstanceOf(Date)

			const [executing] = await db()
				.update(agentTasks)
				.set({ status: 'executing', executedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(executing.status).toBe('executing')
			expect(executing.executedAt).toBeInstanceOf(Date)

			const [verifying] = await db()
				.update(agentTasks)
				.set({ status: 'verifying', verifiedAt: new Date() })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(verifying.status).toBe('verifying')
			expect(verifying.verifiedAt).toBeInstanceOf(Date)

			const [done] = await db()
				.update(agentTasks)
				.set({ status: 'done', result: { output: 'success' } })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(done.status).toBe('done')
			expect(done.result).toEqual({ output: 'success' })

			const [final] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))
			expect(final.status).toBe('done')
			expect(final.proposedAt).toBeInstanceOf(Date)
			expect(final.approvedAt).toBeInstanceOf(Date)
			expect(final.executedAt).toBeInstanceOf(Date)
			expect(final.verifiedAt).toBeInstanceOf(Date)
		})
	})

	describe('agent task failure path', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('transitions proposed → approved → executing → failed → escalated', async () => {
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
					payload: { subject: 'failure test' },
				})
				.returning()

			await db()
				.update(agentTasks)
				.set({ status: 'approved', approvedAt: new Date() })
				.where(eq(agentTasks.id, task.id))

			await db()
				.update(agentTasks)
				.set({ status: 'executing', executedAt: new Date() })
				.where(eq(agentTasks.id, task.id))

			const [failed] = await db()
				.update(agentTasks)
				.set({ status: 'failed', result: { error: 'timeout' } })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(failed.status).toBe('failed')

			const [escalated] = await db()
				.update(agentTasks)
				.set({ status: 'escalated', result: { error: 'timeout', escalatedTo: 'human' } })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(escalated.status).toBe('escalated')
			expect(escalated.result).toEqual({ error: 'timeout', escalatedTo: 'human' })
		})
	})

	describe('agent task rejection', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('transitions proposed → rejected', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [task] = await db()
				.insert(agentTasks)
				.values({
					projectId,
					agentType: 'booking_reminder',
					status: 'proposed',
					payload: { reminder: 'test rejection' },
				})
				.returning()

			const [rejected] = await db()
				.update(agentTasks)
				.set({ status: 'rejected' })
				.where(eq(agentTasks.id, task.id))
				.returning()
			expect(rejected.status).toBe('rejected')

			const [final] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))
			expect(final.status).toBe('rejected')
		})
	})

	describe('concurrent task isolation', () => {
		let userId: string
		let projectIdA: string
		let projectIdB: string

		afterEach(async () => {
			if (projectIdB) await cleanupTestProject(projectIdB)
			if (projectIdA) await cleanupTestProject(projectIdA)
			if (userId) await cleanupTestUser(userId)
		})

		it('tasks in project A do not appear in project B queries', async () => {
			const user = await createTestUser()
			userId = user.id

			const projectA = await createTestProject(userId)
			projectIdA = projectA.id
			const projectB = await createTestProject(userId)
			projectIdB = projectB.id

			await db()
				.insert(agentTasks)
				.values({
					projectId: projectIdA,
					agentType: 'lead_research',
					status: 'proposed',
					payload: { source: 'project-a' },
				})

			await db()
				.insert(agentTasks)
				.values({
					projectId: projectIdB,
					agentType: 'email_drip',
					status: 'proposed',
					payload: { source: 'project-b' },
				})

			const tasksA = await db()
				.select()
				.from(agentTasks)
				.where(eq(agentTasks.projectId, projectIdA))

			expect(tasksA).toHaveLength(1)
			expect((tasksA[0].payload as Record<string, unknown>).source).toBe('project-a')
		})
	})

	describe('agent events audit trail', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts 5 events and verifies order and types', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const eventTypes = [
				'proposal',
				'approval',
				'execution',
				'verification',
				'escalation',
			] as const

			for (const eventType of eventTypes) {
				await db()
					.insert(agentEvents)
					.values({
						projectId,
						userId,
						eventType,
						payload: { step: eventType },
					})
			}

			const events = await db()
				.select()
				.from(agentEvents)
				.where(eq(agentEvents.projectId, projectId))
				.orderBy(asc(agentEvents.createdAt))

			expect(events).toHaveLength(5)
			for (let i = 0; i < eventTypes.length; i++) {
				expect(events[i].eventType).toBe(eventTypes[i])
				expect(events[i].createdAt).toBeInstanceOf(Date)
			}
		})
	})

	describe('agent events nullable userId', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts agent event with userId=null for system-initiated events', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const [event] = await db()
				.insert(agentEvents)
				.values({
					projectId,
					userId: null,
					eventType: 'execution',
					payload: { initiator: 'system', action: 'auto-retry' },
				})
				.returning()

			expect(event.userId).toBeNull()
			expect(event.eventType).toBe('execution')
			expect(event.payload).toEqual({ initiator: 'system', action: 'auto-retry' })
		})
	})

	describe('auto-approve via wishes', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('stores and retrieves autoApprove JSONB structure in wishes', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const wishes = {
				autoApprove: { booking_confirmation: true, lead_research: false },
				preferences: { notify: true },
			}

			await db().update(projects).set({ wishes }).where(eq(projects.id, projectId))

			const [updated] = await db().select().from(projects).where(eq(projects.id, projectId))
			expect(updated.wishes).toEqual(wishes)
			expect(
				(updated.wishes as Record<string, Record<string, boolean>>).autoApprove
					.booking_confirmation,
			).toBe(true)
		})
	})
})
