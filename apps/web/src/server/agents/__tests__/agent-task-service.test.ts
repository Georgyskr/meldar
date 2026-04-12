import type { AgentTaskStatus, AgentType } from '@meldar/db/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const FAKE_TASK_ID = '00000000-0000-4000-8000-000000000001'
const FAKE_PROJECT_ID = '00000000-0000-4000-8000-000000000002'
const FAKE_USER_ID = '00000000-0000-4000-8000-000000000003'

function makeTask(
	overrides: Partial<{
		id: string
		projectId: string
		agentType: AgentType
		status: AgentTaskStatus
		payload: unknown
		result: unknown
		autoApproved: boolean
		proposedAt: Date
		approvedAt: Date | null
		executedAt: Date | null
		verifiedAt: Date | null
	}> = {},
) {
	return {
		id: FAKE_TASK_ID,
		projectId: FAKE_PROJECT_ID,
		agentType: 'lead_research' as AgentType,
		status: 'proposed' as AgentTaskStatus,
		payload: { foo: 'bar' },
		result: null,
		autoApproved: false,
		proposedAt: new Date('2026-04-10T10:00:00Z'),
		approvedAt: null,
		executedAt: null,
		verifiedAt: null,
		...overrides,
	}
}

const selectQueue: unknown[][] = []
const returningQueue: unknown[][] = []

function pushSelectResult(rows: unknown[]) {
	selectQueue.push(rows)
}

function pushReturningResult(rows: unknown[]) {
	returningQueue.push(rows)
}

function nextSelect() {
	return selectQueue.shift() ?? []
}

function nextReturning() {
	return returningQueue.shift() ?? []
}

const mockInsertValues = vi.fn()
const mockUpdateSet = vi.fn()

function makeSelectChain() {
	const chain: Record<string, unknown> = {
		from: () => chain,
		where: () => chain,
		orderBy: () => chain,
		limit: async () => nextSelect(),
		// biome-ignore lint/suspicious/noThenProperty: drizzle queries are thenables
		then: (resolve: (v: unknown) => unknown) => resolve(nextSelect()),
	}
	return chain
}

function makeInsertChain() {
	const chain: Record<string, unknown> = {
		values: (vals: unknown) => {
			mockInsertValues(vals)
			return chain
		},
		onConflictDoUpdate: () => chain,
		returning: async () => nextReturning(),
		// biome-ignore lint/suspicious/noThenProperty: drizzle inserts are thenables
		then: (resolve: (v: unknown) => unknown) => resolve([]),
	}
	return chain
}

function makeUpdateChain() {
	const chain: Record<string, unknown> = {
		set: (vals: unknown) => {
			mockUpdateSet(vals)
			return chain
		},
		where: () => chain,
		returning: async () => nextReturning(),
	}
	return chain
}

const insertedTables: unknown[] = []
const updatedTables: unknown[] = []

const mockDb = {
	insert: (table: unknown) => {
		insertedTables.push(table)
		return makeInsertChain()
	},
	update: (table: unknown) => {
		updatedTables.push(table)
		return makeUpdateChain()
	},
	select: () => makeSelectChain(),
}

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockDb,
}))

import {
	approveTask,
	completeTask,
	escalateTask,
	executeTask,
	failTask,
	getPendingTasks,
	getTaskHistory,
	InvalidTaskTransitionError,
	proposeTask,
	reapStuckExecutingTasks,
	rejectTask,
	TaskNotFoundError,
} from '../agent-task-service'

describe('agent-task-service', () => {
	beforeEach(() => {
		selectQueue.length = 0
		returningQueue.length = 0
		insertedTables.length = 0
		updatedTables.length = 0
		mockInsertValues.mockClear()
		mockUpdateSet.mockClear()
	})

	describe('proposeTask', () => {
		it('inserts into agentTasks and agentEvents', async () => {
			pushReturningResult([makeTask()])

			const result = await proposeTask(FAKE_PROJECT_ID, 'lead_research', { foo: 'bar' })

			expect(result.status).toBe('proposed')
			expect(result.projectId).toBe(FAKE_PROJECT_ID)
			expect(insertedTables.length).toBeGreaterThanOrEqual(2)
		})

		it('returns the created task', async () => {
			pushReturningResult([makeTask({ agentType: 'email_drip' })])

			const result = await proposeTask(FAKE_PROJECT_ID, 'email_drip', { subject: 'test' })

			expect(result.id).toBe(FAKE_TASK_ID)
			expect(result.agentType).toBe('email_drip')
		})
	})

	describe('approveTask', () => {
		it('transitions proposed to approved', async () => {
			pushSelectResult([makeTask({ status: 'proposed' })])
			pushReturningResult([makeTask({ status: 'approved', approvedAt: new Date() })])

			const result = await approveTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)

			expect(result.status).toBe('approved')
		})

		it('throws TaskNotFoundError when task does not exist', async () => {
			pushSelectResult([])

			await expect(approveTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)).rejects.toThrow(
				TaskNotFoundError,
			)
		})

		it('throws InvalidTaskTransitionError when task is not proposed', async () => {
			pushSelectResult([makeTask({ status: 'executing' })])

			await expect(approveTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)).rejects.toThrow(
				InvalidTaskTransitionError,
			)
		})
	})

	describe('rejectTask', () => {
		it('transitions proposed to rejected', async () => {
			pushSelectResult([makeTask({ status: 'proposed' })])
			pushReturningResult([makeTask({ status: 'rejected' })])

			const result = await rejectTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)

			expect(result.status).toBe('rejected')
		})

		it('throws TaskNotFoundError when task does not exist', async () => {
			pushSelectResult([])

			await expect(rejectTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)).rejects.toThrow(
				TaskNotFoundError,
			)
		})

		it('throws InvalidTaskTransitionError when task is not proposed', async () => {
			pushSelectResult([makeTask({ status: 'done' })])

			await expect(rejectTask(FAKE_TASK_ID, FAKE_USER_ID, FAKE_PROJECT_ID)).rejects.toThrow(
				InvalidTaskTransitionError,
			)
		})
	})

	describe('executeTask', () => {
		it('transitions approved to executing', async () => {
			pushSelectResult([makeTask({ status: 'approved' })])
			pushReturningResult([makeTask({ status: 'executing', executedAt: new Date() })])

			const result = await executeTask(FAKE_TASK_ID)

			expect(result.status).toBe('executing')
		})

		it('throws InvalidTaskTransitionError when task is not approved', async () => {
			pushSelectResult([makeTask({ status: 'proposed' })])

			await expect(executeTask(FAKE_TASK_ID)).rejects.toThrow(InvalidTaskTransitionError)
		})
	})

	describe('completeTask', () => {
		it('transitions verifying to done', async () => {
			pushSelectResult([makeTask({ status: 'verifying' })])
			pushReturningResult([makeTask({ status: 'done', result: { output: 'success' } })])

			const result = await completeTask(FAKE_TASK_ID, { output: 'success' })

			expect(result.status).toBe('done')
		})

		it('throws InvalidTaskTransitionError when task is not verifying', async () => {
			pushSelectResult([makeTask({ status: 'executing' })])

			await expect(completeTask(FAKE_TASK_ID, {})).rejects.toThrow(InvalidTaskTransitionError)
		})
	})

	describe('escalateTask', () => {
		it('transitions failed to escalated', async () => {
			pushSelectResult([makeTask({ status: 'failed' })])
			pushReturningResult([makeTask({ status: 'escalated' })])

			const result = await escalateTask(FAKE_TASK_ID, 'needs human review')

			expect(result.status).toBe('escalated')
		})

		it('throws InvalidTaskTransitionError when task is not failed', async () => {
			pushSelectResult([makeTask({ status: 'done' })])

			await expect(escalateTask(FAKE_TASK_ID, 'reason')).rejects.toThrow(InvalidTaskTransitionError)
		})
	})

	describe('getPendingTasks', () => {
		it('returns tasks with proposed status', async () => {
			const tasks = [
				makeTask({ id: 'aaa', status: 'proposed' }),
				makeTask({ id: 'bbb', status: 'proposed' }),
			]
			pushSelectResult(tasks)

			const result = await getPendingTasks(FAKE_PROJECT_ID)

			expect(result).toHaveLength(2)
		})

		it('returns empty array when no pending tasks', async () => {
			pushSelectResult([])

			const result = await getPendingTasks(FAKE_PROJECT_ID)

			expect(result).toEqual([])
		})
	})

	describe('getTaskHistory', () => {
		it('returns tasks ordered by proposedAt descending', async () => {
			const tasks = [
				makeTask({ id: 'recent', proposedAt: new Date('2026-04-10T12:00:00Z') }),
				makeTask({ id: 'older', proposedAt: new Date('2026-04-10T10:00:00Z') }),
			]
			pushSelectResult(tasks)

			const result = await getTaskHistory(FAKE_PROJECT_ID, 10)

			expect(result).toHaveLength(2)
		})

		it('returns empty array when no tasks exist', async () => {
			pushSelectResult([])

			const result = await getTaskHistory(FAKE_PROJECT_ID, 10)

			expect(result).toEqual([])
		})
	})

	describe('failTask', () => {
		it('transitions executing to failed', async () => {
			pushSelectResult([makeTask({ status: 'executing' })])
			pushReturningResult([makeTask({ status: 'failed' })])

			const result = await failTask(FAKE_TASK_ID, 'timeout')

			expect(result.status).toBe('failed')
		})

		it('transitions verifying to failed', async () => {
			pushSelectResult([makeTask({ status: 'verifying' })])
			pushReturningResult([makeTask({ status: 'failed' })])

			const result = await failTask(FAKE_TASK_ID, 'verification failed')

			expect(result.status).toBe('failed')
		})

		it('throws InvalidTaskTransitionError when task is proposed', async () => {
			pushSelectResult([makeTask({ status: 'proposed' })])

			await expect(failTask(FAKE_TASK_ID, 'reason')).rejects.toThrow(InvalidTaskTransitionError)
		})
	})

	describe('reapStuckExecutingTasks', () => {
		it('returns count of reaped tasks', async () => {
			const fiveMinutesAgo = new Date(Date.now() - 6 * 60 * 1000)
			pushReturningResult([
				makeTask({ id: 'stuck-1', status: 'executing', executedAt: fiveMinutesAgo }),
				makeTask({ id: 'stuck-2', status: 'executing', executedAt: fiveMinutesAgo }),
			])

			const count = await reapStuckExecutingTasks(new Date(Date.now() - 5 * 60 * 1000))

			expect(count).toBe(2)
		})

		it('returns 0 when no tasks are stuck', async () => {
			pushReturningResult([])

			const count = await reapStuckExecutingTasks(new Date(Date.now() - 5 * 60 * 1000))

			expect(count).toBe(0)
		})
	})

	describe('error types', () => {
		it('TaskNotFoundError has correct code', () => {
			const err = new TaskNotFoundError('abc')
			expect(err.code).toBe('task_not_found')
			expect(err.taskId).toBe('abc')
			expect(err.message).toContain('abc')
		})

		it('InvalidTaskTransitionError has correct code and fields', () => {
			const err = new InvalidTaskTransitionError('abc', 'proposed', 'executing')
			expect(err.code).toBe('invalid_task_transition')
			expect(err.taskId).toBe('abc')
			expect(err.currentStatus).toBe('proposed')
			expect(err.attemptedStatus).toBe('executing')
		})
	})
})
