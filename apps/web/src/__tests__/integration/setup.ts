import { randomUUID } from 'node:crypto'
import { getDb } from '@meldar/db/client'
import {
	agentEvents,
	agentTasks,
	aiCallLog,
	auditOrders,
	buildFiles,
	builds,
	deploymentLog,
	discoverySessions,
	kanbanCards,
	projectDomains,
	projectFiles,
	projects,
	subscribers,
	tokenTransactions,
	users,
	xrayResults,
} from '@meldar/db/schema'
import { eq } from 'drizzle-orm'

export const HAS_DATABASE = !!process.env.DATABASE_URL

export function db() {
	return getDb()
}

export function testEmail() {
	return `test-${randomUUID()}@meldar-test.local`
}

export async function createTestUser(overrides?: { email?: string }) {
	const email = overrides?.email ?? testEmail()
	const [user] = await db()
		.insert(users)
		.values({
			email,
			passwordHash: 'test-hash-not-real',
			name: 'Integration Test User',
		})
		.returning()
	return user
}

export async function createTestProject(userId: string) {
	const [project] = await db()
		.insert(projects)
		.values({
			userId,
			name: 'Integration Test Project',
			templateId: 'test-template-v1',
		})
		.returning()
	return project
}

export async function cleanupTestUser(id: string) {
	await db().delete(users).where(eq(users.id, id))
}

export async function cleanupTestProject(id: string) {
	await db().delete(projects).where(eq(projects.id, id))
}

export {
	agentEvents,
	agentTasks,
	aiCallLog,
	auditOrders,
	buildFiles,
	builds,
	deploymentLog,
	discoverySessions,
	kanbanCards,
	projectDomains,
	projectFiles,
	projects,
	subscribers,
	tokenTransactions,
	users,
	xrayResults,
}
