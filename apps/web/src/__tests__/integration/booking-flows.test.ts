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
} from './setup'

describe.skipIf(!HAS_DATABASE)('booking flow integration tests — real DB', () => {
	describe('project domain active lookup', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts active subdomain and queries it back', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const domain = `booking-${randomUUID().slice(0, 8)}.meldar.app`
			await db().insert(projectDomains).values({
				projectId,
				type: 'subdomain',
				domain,
				state: 'active',
			})

			const active = await db()
				.select()
				.from(projectDomains)
				.where(and(eq(projectDomains.projectId, projectId), eq(projectDomains.state, 'active')))

			expect(active).toHaveLength(1)
			expect(active[0].domain).toBe(domain)
			expect(active[0].type).toBe('subdomain')
		})
	})

	describe('booking confirmation task with payload', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('inserts booking_confirmation task and queries by project and type', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const payload = {
				guestName: 'Jane Doe',
				checkIn: '2026-05-01',
				checkOut: '2026-05-03',
				roomType: 'deluxe',
			}

			await db().insert(agentTasks).values({
				projectId,
				agentType: 'booking_confirmation',
				status: 'proposed',
				payload,
			})

			const [found] = await db()
				.select()
				.from(agentTasks)
				.where(
					and(
						eq(agentTasks.projectId, projectId),
						eq(agentTasks.agentType, 'booking_confirmation'),
					),
				)

			expect(found).toBeDefined()
			expect(found.payload).toEqual(payload)
			expect((found.payload as Record<string, unknown>).guestName).toBe('Jane Doe')
			expect((found.payload as Record<string, unknown>).roomType).toBe('deluxe')
		})
	})

	describe('domain uniqueness constraint', () => {
		let userId: string
		let projectId: string

		afterEach(async () => {
			if (projectId) await cleanupTestProject(projectId)
			if (userId) await cleanupTestUser(userId)
		})

		it('throws on duplicate domain string', async () => {
			const user = await createTestUser()
			userId = user.id
			const project = await createTestProject(userId)
			projectId = project.id

			const domain = `unique-${randomUUID().slice(0, 8)}.meldar.app`
			await db().insert(projectDomains).values({
				projectId,
				type: 'subdomain',
				domain,
				state: 'active',
			})

			await expect(
				db().insert(projectDomains).values({
					projectId,
					type: 'subdomain',
					domain,
					state: 'active',
				}),
			).rejects.toThrow()
		})
	})
})
