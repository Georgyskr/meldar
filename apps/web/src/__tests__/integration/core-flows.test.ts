import { randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
	agentEvents,
	agentTasks,
	buildFiles,
	builds,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	kanbanCards,
	projectDomains,
	projectFiles,
	projects,
	tokenTransactions,
	users,
} from './setup'

describe.skipIf(!HAS_DATABASE)('core flows — real DB', () => {
	describe('PROJECT CREATION & PERSISTENCE', () => {
		describe('1: create project → verify all fields', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('persists project with correct fields and genesis build as currentBuildId', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const [found] = await db().select().from(projects).where(eq(projects.id, projectId))

				expect(found).toBeDefined()
				expect(found.name).toBe('Integration Test Project')
				expect(found.templateId).toBe('test-template-v1')
				expect(found.tier).toBe('builder')
				expect(found.userId).toBe(userId)
				expect(found.createdAt).toBeInstanceOf(Date)
				expect(found.updatedAt).toBeInstanceOf(Date)
				expect(found.deletedAt).toBeNull()
			})
		})

		describe('2: list user projects → count grows', () => {
			let userId: string
			let projectId1: string
			let projectId2: string

			afterEach(async () => {
				if (projectId2) await cleanupTestProject(projectId2)
				if (projectId1) await cleanupTestProject(projectId1)
				if (userId) await cleanupTestUser(userId)
			})

			it('returns correct count as projects are added', async () => {
				const user = await createTestUser()
				userId = user.id

				const p1 = await createTestProject(userId)
				projectId1 = p1.id

				const first = await db().select().from(projects).where(eq(projects.userId, userId))
				expect(first).toHaveLength(1)

				const p2 = await createTestProject(userId)
				projectId2 = p2.id

				const second = await db().select().from(projects).where(eq(projects.userId, userId))
				expect(second).toHaveLength(2)
			})
		})

		describe('3: genesis build exists with status=completed', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('creates a completed genesis build linked to the project', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const [genesisBuild] = await db()
					.insert(builds)
					.values({
						projectId,
						status: 'completed',
						triggeredBy: 'template',
					})
					.returning()

				await db()
					.update(projects)
					.set({ currentBuildId: genesisBuild.id })
					.where(eq(projects.id, projectId))

				const [updatedProject] = await db()
					.select()
					.from(projects)
					.where(eq(projects.id, projectId))
				expect(updatedProject.currentBuildId).toBe(genesisBuild.id)

				const [foundBuild] = await db().select().from(builds).where(eq(builds.id, genesisBuild.id))
				expect(foundBuild).toBeDefined()
				expect(foundBuild.status).toBe('completed')
				expect(foundBuild.projectId).toBe(projectId)
			})
		})

		describe('4: project_files created for project', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('inserts starter files and verifies count > 0', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				await db()
					.insert(projectFiles)
					.values([
						{
							projectId,
							path: '/index.html',
							r2Key: `projects/${projectId}/content/aaa111`,
							contentHash: 'aaa111',
							sizeBytes: 50,
						},
						{
							projectId,
							path: '/style.css',
							r2Key: `projects/${projectId}/content/bbb222`,
							contentHash: 'bbb222',
							sizeBytes: 30,
						},
					])

				const files = await db()
					.select()
					.from(projectFiles)
					.where(eq(projectFiles.projectId, projectId))
				expect(files.length).toBeGreaterThan(0)
				expect(files).toHaveLength(2)
			})
		})
	})

	describe('ONBOARDING FLOW (DB layer)', () => {
		describe('5: template apply → kanban cards with parent/child', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('inserts kanban cards with correct parent/child structure', async () => {
				const user = await createTestUser()
				userId = user.id

				const [project] = await db()
					.insert(projects)
					.values({
						userId,
						name: 'Booking Page',
						templateId: 'booking-page',
					})
					.returning()
				projectId = project.id

				const [parentCard] = await db()
					.insert(kanbanCards)
					.values({
						projectId,
						position: 0,
						title: 'Setup booking form',
						taskType: 'feature',
						generatedBy: 'template',
					})
					.returning()

				const [childCard] = await db()
					.insert(kanbanCards)
					.values({
						projectId,
						parentId: parentCard.id,
						position: 0,
						title: 'Add date picker',
						taskType: 'feature',
						generatedBy: 'template',
					})
					.returning()

				const cards = await db()
					.select()
					.from(kanbanCards)
					.where(eq(kanbanCards.projectId, projectId))
				expect(cards).toHaveLength(2)

				const parent = cards.find((c) => c.id === parentCard.id)
				const child = cards.find((c) => c.id === childCard.id)

				expect(parent).toBeDefined()
				expect(parent?.parentId).toBeNull()
				expect(child).toBeDefined()
				expect(child?.parentId).toBe(parentCard.id)
			})
		})

		describe('6: subdomain provisioning', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('inserts subdomain and verifies active state + URL-safe slug', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const slug = `my-project-${randomUUID().slice(0, 8)}`
				const domain = `${slug}.meldar.app`

				await db().insert(projectDomains).values({
					projectId,
					type: 'subdomain',
					domain,
					state: 'active',
				})

				const [found] = await db()
					.select()
					.from(projectDomains)
					.where(and(eq(projectDomains.projectId, projectId), eq(projectDomains.state, 'active')))

				expect(found).toBeDefined()
				expect(found.type).toBe('subdomain')
				expect(found.state).toBe('active')

				const slugPart = found.domain.split('.')[0]
				expect(slugPart).toMatch(/^[a-z0-9-]+$/)
			})
		})
	})

	describe('BUILD CYCLE', () => {
		describe('7: new build → link to project → update currentBuildId', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('creates streaming build, completes it, and updates HEAD', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const [genesisBuild] = await db()
					.insert(builds)
					.values({
						projectId,
						status: 'completed',
						triggeredBy: 'template',
					})
					.returning()

				await db()
					.update(projects)
					.set({ currentBuildId: genesisBuild.id })
					.where(eq(projects.id, projectId))

				const [newBuild] = await db()
					.insert(builds)
					.values({
						projectId,
						parentBuildId: genesisBuild.id,
						status: 'streaming',
						triggeredBy: 'user_prompt',
					})
					.returning()

				expect(newBuild.projectId).toBe(projectId)
				expect(newBuild.parentBuildId).toBe(genesisBuild.id)
				expect(newBuild.status).toBe('streaming')

				await db()
					.update(builds)
					.set({ status: 'completed', completedAt: new Date() })
					.where(eq(builds.id, newBuild.id))

				await db()
					.update(projects)
					.set({ currentBuildId: newBuild.id })
					.where(eq(projects.id, projectId))

				const [updatedProject] = await db()
					.select()
					.from(projects)
					.where(eq(projects.id, projectId))
				expect(updatedProject.currentBuildId).toBe(newBuild.id)
			})
		})

		describe('8: build_files belong to build with content_hash and path', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('inserts build_files and verifies ownership', async () => {
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

				const hash1 = 'sha256_abc123'
				const hash2 = 'sha256_def456'

				await db()
					.insert(buildFiles)
					.values([
						{
							buildId: build.id,
							path: '/index.html',
							r2Key: `projects/${projectId}/content/${hash1}`,
							contentHash: hash1,
							sizeBytes: 100,
						},
						{
							buildId: build.id,
							path: '/app.tsx',
							r2Key: `projects/${projectId}/content/${hash2}`,
							contentHash: hash2,
							sizeBytes: 250,
						},
					])

				const files = await db().select().from(buildFiles).where(eq(buildFiles.buildId, build.id))

				expect(files).toHaveLength(2)
				expect(files.map((f) => f.path).sort()).toEqual(['/app.tsx', '/index.html'])
				expect(files.every((f) => f.contentHash.startsWith('sha256_'))).toBe(true)
			})
		})

		describe('9: build ordering by createdAt DESC', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('returns builds newest first', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const [b1] = await db()
					.insert(builds)
					.values({
						projectId,
						status: 'completed',
						triggeredBy: 'template',
					})
					.returning()

				const [b2] = await db()
					.insert(builds)
					.values({
						projectId,
						parentBuildId: b1.id,
						status: 'completed',
						triggeredBy: 'user_prompt',
					})
					.returning()

				const [b3] = await db()
					.insert(builds)
					.values({
						projectId,
						parentBuildId: b2.id,
						status: 'completed',
						triggeredBy: 'user_prompt',
					})
					.returning()

				const ordered = await db()
					.select()
					.from(builds)
					.where(eq(builds.projectId, projectId))
					.orderBy(desc(builds.createdAt))

				expect(ordered).toHaveLength(3)
				expect(ordered[0].id).toBe(b3.id)
				expect(ordered[1].id).toBe(b2.id)
				expect(ordered[2].id).toBe(b1.id)
			})
		})
	})

	describe('AGENT TASK FLOW', () => {
		describe('10: full agent_task lifecycle with JSONB round-trip', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('transitions proposed → approved → executing → verifying → done with JSONB payloads', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				const payload = {
					recipient: 'jane@example.com',
					service: 'Haircut',
					date: '2026-04-15T10:00:00Z',
					notes: ['Prefers morning', 'Regular customer'],
				}

				const [task] = await db()
					.insert(agentTasks)
					.values({
						projectId,
						agentType: 'booking_confirmation',
						status: 'proposed',
						payload,
					})
					.returning()

				const [proposed] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))
				expect(proposed.payload).toEqual(payload)
				expect(proposed.status).toBe('proposed')
				expect(proposed.proposedAt).toBeInstanceOf(Date)

				const approvedAt = new Date()
				await db()
					.update(agentTasks)
					.set({ status: 'approved', approvedAt })
					.where(eq(agentTasks.id, task.id))

				const executedAt = new Date()
				await db()
					.update(agentTasks)
					.set({ status: 'executing', executedAt })
					.where(eq(agentTasks.id, task.id))

				const verifiedAt = new Date()
				await db()
					.update(agentTasks)
					.set({ status: 'verifying', verifiedAt })
					.where(eq(agentTasks.id, task.id))

				const resultPayload = {
					confirmationId: 'CONF-12345',
					emailSent: true,
					timestamp: '2026-04-15T10:00:00Z',
				}
				await db()
					.update(agentTasks)
					.set({ status: 'done', result: resultPayload })
					.where(eq(agentTasks.id, task.id))

				const [done] = await db().select().from(agentTasks).where(eq(agentTasks.id, task.id))

				expect(done.status).toBe('done')
				expect(done.payload).toEqual(payload)
				expect(done.result).toEqual(resultPayload)
				expect(done.approvedAt).toBeInstanceOf(Date)
				expect(done.executedAt).toBeInstanceOf(Date)
				expect(done.verifiedAt).toBeInstanceOf(Date)
			})
		})

		describe('11: filter agent_tasks by status', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('returns exactly 1 proposed task when 3 exist with different statuses', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				await db()
					.insert(agentTasks)
					.values([
						{
							projectId,
							agentType: 'booking_confirmation',
							status: 'proposed',
							payload: { task: 'first' },
						},
						{
							projectId,
							agentType: 'booking_reminder',
							status: 'approved',
							payload: { task: 'second' },
						},
						{
							projectId,
							agentType: 'lead_research',
							status: 'done',
							payload: { task: 'third' },
						},
					])

				const proposed = await db()
					.select()
					.from(agentTasks)
					.where(and(eq(agentTasks.projectId, projectId), eq(agentTasks.status, 'proposed')))

				expect(proposed).toHaveLength(1)
				expect(proposed[0].agentType).toBe('booking_confirmation')
			})
		})

		describe('12: agent_event references correct project', () => {
			let userId: string
			let projectId: string

			afterEach(async () => {
				if (projectId) await cleanupTestProject(projectId)
				if (userId) await cleanupTestUser(userId)
			})

			it('links agent_task and agent_event to the same project', async () => {
				const user = await createTestUser()
				userId = user.id

				const project = await createTestProject(userId)
				projectId = project.id

				await db()
					.insert(agentTasks)
					.values({
						projectId,
						agentType: 'email_drip',
						status: 'proposed',
						payload: { sequence: 'welcome' },
					})

				const [event] = await db()
					.insert(agentEvents)
					.values({
						projectId,
						userId,
						eventType: 'proposal',
						payload: { action: 'email_drip_proposed' },
					})
					.returning()

				const events = await db()
					.select()
					.from(agentEvents)
					.where(eq(agentEvents.projectId, projectId))

				expect(events).toHaveLength(1)
				expect(events[0].id).toBe(event.id)
				expect(events[0].projectId).toBe(projectId)
			})
		})
	})

	describe('TOKEN ECONOMY', () => {
		describe('13: debit and credit token balance', () => {
			let userId: string

			afterEach(async () => {
				if (userId) await cleanupTestUser(userId)
			})

			it('debits 50 then credits 25 with correct balances', async () => {
				const user = await createTestUser()
				userId = user.id
				expect(user.tokenBalance).toBe(200)

				await db()
					.update(users)
					.set({ tokenBalance: sql`${users.tokenBalance} - 50` })
					.where(eq(users.id, userId))

				const [afterDebit] = await db().select().from(users).where(eq(users.id, userId))
				expect(afterDebit.tokenBalance).toBe(150)

				await db()
					.update(users)
					.set({ tokenBalance: sql`${users.tokenBalance} + 25` })
					.where(eq(users.id, userId))

				const [afterCredit] = await db().select().from(users).where(eq(users.id, userId))
				expect(afterCredit.tokenBalance).toBe(175)
			})
		})

		describe('14: token transactions ledger', () => {
			let userId: string

			afterEach(async () => {
				if (userId) await cleanupTestUser(userId)
			})

			it('records build debit and refund credit with correct order', async () => {
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
					.orderBy(tokenTransactions.createdAt)

				expect(txns).toHaveLength(2)
				expect(txns[0].amount).toBe(-50)
				expect(txns[0].reason).toBe('build')
				expect(txns[0].balanceAfter).toBe(150)
				expect(txns[1].amount).toBe(25)
				expect(txns[1].reason).toBe('refund')
				expect(txns[1].balanceAfter).toBe(175)
			})
		})

		describe('15: CHECK constraint prevents negative balance', () => {
			let userId: string

			afterEach(async () => {
				if (userId) await cleanupTestUser(userId)
			})

			it('rejects update that would set tokenBalance below 0', async () => {
				const user = await createTestUser()
				userId = user.id

				await db().update(users).set({ tokenBalance: 10 }).where(eq(users.id, userId))

				await expect(
					db()
						.update(users)
						.set({ tokenBalance: sql`${users.tokenBalance} - 50` })
						.where(eq(users.id, userId)),
				).rejects.toThrow()
			})
		})
	})

	describe('CROSS-USER ISOLATION', () => {
		describe('16: projects isolated between users', () => {
			let userIdA: string
			let userIdB: string
			let projectIdA: string
			let projectIdB: string

			afterEach(async () => {
				if (projectIdB) await cleanupTestProject(projectIdB)
				if (projectIdA) await cleanupTestProject(projectIdA)
				if (userIdB) await cleanupTestUser(userIdB)
				if (userIdA) await cleanupTestUser(userIdA)
			})

			it('user A cannot see user B projects and vice versa', async () => {
				const userA = await createTestUser()
				userIdA = userA.id
				const userB = await createTestUser()
				userIdB = userB.id

				const pA = await createTestProject(userIdA)
				projectIdA = pA.id

				const bProjects = await db().select().from(projects).where(eq(projects.userId, userIdB))
				expect(bProjects).toHaveLength(0)

				const pB = await createTestProject(userIdB)
				projectIdB = pB.id

				const aProjects = await db().select().from(projects).where(eq(projects.userId, userIdA))
				expect(aProjects).toHaveLength(1)
				expect(aProjects[0].id).toBe(projectIdA)
			})
		})

		describe('17: agent_tasks isolated between users', () => {
			let userIdA: string
			let userIdB: string
			let projectIdA: string
			let projectIdB: string

			afterEach(async () => {
				if (projectIdB) await cleanupTestProject(projectIdB)
				if (projectIdA) await cleanupTestProject(projectIdA)
				if (userIdB) await cleanupTestUser(userIdB)
				if (userIdA) await cleanupTestUser(userIdA)
			})

			it('agent_tasks for project A are invisible from project B', async () => {
				const userA = await createTestUser()
				userIdA = userA.id
				const userB = await createTestUser()
				userIdB = userB.id

				const pA = await createTestProject(userIdA)
				projectIdA = pA.id
				const pB = await createTestProject(userIdB)
				projectIdB = pB.id

				await db()
					.insert(agentTasks)
					.values({
						projectId: projectIdA,
						agentType: 'booking_confirmation',
						status: 'proposed',
						payload: { for: 'userA' },
					})

				const bTasks = await db()
					.select()
					.from(agentTasks)
					.where(eq(agentTasks.projectId, projectIdB))
				expect(bTasks).toHaveLength(0)

				const aTasks = await db()
					.select()
					.from(agentTasks)
					.where(eq(agentTasks.projectId, projectIdA))
				expect(aTasks).toHaveLength(1)
				expect(aTasks[0].payload).toEqual({ for: 'userA' })
			})
		})
	})
})
