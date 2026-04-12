import { getDb } from '@meldar/db/client'
import type { AgentTaskStatus, AgentType } from '@meldar/db/schema'
import * as schema from '@meldar/db/schema'
import { and, desc, eq, lt, sql } from 'drizzle-orm'

export type AgentTask = typeof schema.agentTasks.$inferSelect

export class TaskNotFoundError extends Error {
	readonly code = 'task_not_found'
	readonly taskId: string

	constructor(taskId: string) {
		super(`task not found: ${taskId}`)
		this.name = 'TaskNotFoundError'
		this.taskId = taskId
	}
}

export class InvalidTaskTransitionError extends Error {
	readonly code = 'invalid_task_transition'
	readonly taskId: string
	readonly currentStatus: AgentTaskStatus
	readonly attemptedStatus: string

	constructor(taskId: string, currentStatus: AgentTaskStatus, attemptedStatus: string) {
		super(`cannot transition task ${taskId} from '${currentStatus}' to '${attemptedStatus}'`)
		this.name = 'InvalidTaskTransitionError'
		this.taskId = taskId
		this.currentStatus = currentStatus
		this.attemptedStatus = attemptedStatus
	}
}

const VALID_TRANSITIONS: Record<string, AgentTaskStatus> = {
	'proposed→approved': 'approved',
	'proposed→rejected': 'rejected',
	'approved→executing': 'executing',
	'executing→verifying': 'verifying',
	'executing→failed': 'failed',
	'verifying→done': 'done',
	'verifying→failed': 'failed',
	'failed→escalated': 'escalated',
}

function assertTransition(taskId: string, current: AgentTaskStatus, target: string): void {
	const key = `${current}→${target}`
	if (!VALID_TRANSITIONS[key]) {
		throw new InvalidTaskTransitionError(taskId, current, target)
	}
}

async function findTaskOrThrow(taskId: string): Promise<AgentTask> {
	const db = getDb()
	const rows = await db
		.select()
		.from(schema.agentTasks)
		.where(eq(schema.agentTasks.id, taskId))
		.limit(1)
	const task = rows[0]
	if (!task) {
		throw new TaskNotFoundError(taskId)
	}
	return task
}

async function logEvent(
	projectId: string,
	userId: string | null,
	eventType: schema.AgentEventType,
	payload: Record<string, unknown>,
): Promise<void> {
	const db = getDb()
	await db.insert(schema.agentEvents).values({
		projectId,
		userId,
		eventType,
		payload,
	})
}

export async function proposeTask(
	projectId: string,
	agentType: AgentType,
	payload: Record<string, unknown>,
): Promise<AgentTask> {
	const db = getDb()
	const rows = await db
		.insert(schema.agentTasks)
		.values({
			projectId,
			agentType,
			status: 'proposed',
			payload,
		})
		.returning()

	const task = rows[0]

	await db.insert(schema.agentEvents).values({
		projectId,
		userId: null,
		eventType: 'proposal',
		payload: { taskId: task.id, agentType, payload },
	})

	return task
}

export async function approveTask(
	taskId: string,
	userId: string,
	projectId: string,
): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	if (task.projectId !== projectId) {
		throw new TaskNotFoundError(taskId)
	}
	assertTransition(taskId, task.status, 'approved')

	const db = getDb()
	const now = new Date()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'approved', approvedAt: now })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, userId, 'approval', { taskId })

	return rows[0]
}

export async function rejectTask(
	taskId: string,
	userId: string,
	projectId: string,
): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	if (task.projectId !== projectId) {
		throw new TaskNotFoundError(taskId)
	}
	assertTransition(taskId, task.status, 'rejected')

	const db = getDb()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'rejected' })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, userId, 'rejection', { taskId })

	return rows[0]
}

export async function executeTask(taskId: string): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	assertTransition(taskId, task.status, 'executing')

	const db = getDb()
	const now = new Date()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'executing', executedAt: now })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, null, 'execution', { taskId })

	return rows[0]
}

export async function verifyTask(
	taskId: string,
	result: Record<string, unknown>,
): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	assertTransition(taskId, task.status, 'verifying')

	const db = getDb()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'verifying', result })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, null, 'execution', {
		taskId,
		result,
	})

	return rows[0]
}

export async function completeTask(
	taskId: string,
	result: Record<string, unknown>,
): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	assertTransition(taskId, task.status, 'done')

	const db = getDb()
	const now = new Date()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'done', result, verifiedAt: now })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, null, 'verification', {
		taskId,
		result,
	})

	return rows[0]
}

export async function escalateTask(taskId: string, reason: string): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	assertTransition(taskId, task.status, 'escalated')

	const db = getDb()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'escalated' })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, null, 'escalation', {
		taskId,
		reason,
	})

	return rows[0]
}

export async function failTask(taskId: string, reason: string): Promise<AgentTask> {
	const task = await findTaskOrThrow(taskId)
	assertTransition(taskId, task.status, 'failed')

	const db = getDb()
	const rows = await db
		.update(schema.agentTasks)
		.set({ status: 'failed' })
		.where(eq(schema.agentTasks.id, taskId))
		.returning()

	await logEvent(task.projectId, null, 'error', {
		taskId,
		reason,
	})

	return rows[0]
}

export async function findTaskByResendId(resendId: string): Promise<AgentTask | null> {
	const db = getDb()
	const rows = await db
		.select()
		.from(schema.agentTasks)
		.where(sql`${schema.agentTasks.result}->>'resendId' = ${resendId}`)
		.limit(1)
	return rows[0] ?? null
}

export async function getPendingTasks(projectId: string): Promise<AgentTask[]> {
	const db = getDb()
	return db
		.select()
		.from(schema.agentTasks)
		.where(
			and(eq(schema.agentTasks.projectId, projectId), eq(schema.agentTasks.status, 'proposed')),
		)
}

export async function getTaskHistory(projectId: string, limit: number): Promise<AgentTask[]> {
	const db = getDb()
	return db
		.select()
		.from(schema.agentTasks)
		.where(eq(schema.agentTasks.projectId, projectId))
		.orderBy(desc(schema.agentTasks.proposedAt))
		.limit(limit)
}

export async function reapStuckExecutingTasks(olderThan: Date): Promise<number> {
	const db = getDb()
	const rows = await db
		.update(schema.agentTasks)
		.set({
			status: 'failed' as AgentTaskStatus,
			result: { reason: 'execution timeout' },
		})
		.where(
			and(eq(schema.agentTasks.status, 'executing'), lt(schema.agentTasks.proposedAt, olderThan)),
		)
		.returning()
	return rows.length
}
