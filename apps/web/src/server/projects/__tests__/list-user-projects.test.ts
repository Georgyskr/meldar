import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetDb, mockExecute, setExecuteResult } = vi.hoisted(() => {
	let nextResult: { rows: unknown[] } = { rows: [] }
	const setExecuteResult = (rows: unknown[]) => {
		nextResult = { rows }
	}
	const mockExecute = vi.fn(async () => nextResult)
	const fakeDb = { execute: mockExecute }
	const mockGetDb = vi.fn(() => fakeDb)
	return { mockGetDb, mockExecute, setExecuteResult }
})

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockGetDb(),
}))

import { listUserProjects } from '../list-user-projects'

describe('listUserProjects', () => {
	beforeEach(() => {
		mockGetDb.mockClear()
		mockExecute.mockClear()
		setExecuteResult([])
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('calls getDb and db.execute exactly once per invocation', async () => {
		await listUserProjects('user_42')
		expect(mockGetDb).toHaveBeenCalledTimes(1)
		expect(mockExecute).toHaveBeenCalledTimes(1)
	})

	it('passes the userId as a bound parameter in the SQL', async () => {
		await listUserProjects('user_42')
		const sqlArg = (mockExecute.mock.calls[0] as unknown[])[0] as { queryChunks: unknown[] }
		const stringified = JSON.stringify(sqlArg)
		expect(stringified).toContain('user_42')
	})

	it('generates SQL that filters by user_id and deleted_at', async () => {
		await listUserProjects('user_42')
		const sqlArg = (mockExecute.mock.calls[0] as unknown[])[0] as { queryChunks: unknown[] }
		const sqlText = sqlArg.queryChunks
			.filter((chunk) => typeof chunk === 'object' && chunk && 'value' in chunk)
			.map((chunk) => (chunk as { value: string[] }).value.join(''))
			.join('')
		expect(sqlText.toLowerCase()).toContain('user_id')
		expect(sqlText.toLowerCase()).toContain('deleted_at is null')
	})

	it('generates SQL that orders by last_build_at desc nulls last', async () => {
		await listUserProjects('user_42')
		const sqlArg = (mockExecute.mock.calls[0] as unknown[])[0] as { queryChunks: unknown[] }
		const sqlText = sqlArg.queryChunks
			.filter((chunk) => typeof chunk === 'object' && chunk && 'value' in chunk)
			.map((chunk) => (chunk as { value: string[] }).value.join(''))
			.join('')
			.toLowerCase()
		expect(sqlText).toContain('last_build_at desc nulls last')
		expect(sqlText).toContain('created_at desc')
	})

	it('generates SQL that uses LATERAL joins (no row multiplication)', async () => {
		await listUserProjects('user_42')
		const sqlArg = (mockExecute.mock.calls[0] as unknown[])[0] as { queryChunks: unknown[] }
		const sqlText = sqlArg.queryChunks
			.filter((chunk) => typeof chunk === 'object' && chunk && 'value' in chunk)
			.map((chunk) => (chunk as { value: string[] }).value.join(''))
			.join('')
			.toLowerCase()
		expect(sqlText).toContain('left join lateral')
		expect(sqlText).toContain('limit 1')
	})

	it('returns enriched rows with progress fields coerced to numbers', async () => {
		setExecuteResult([
			{
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Alpha',
				last_build_at: '2026-04-06T10:00:00Z',
				preview_url: 'https://preview.example.com/alpha',
				created_at: '2026-04-05T10:00:00Z',
				total_subtasks: '5',
				built_subtasks: '3',
				failed_subtasks: '0',
				next_card_title: 'Add chart',
				total_milestones: '2',
				completed_milestones: '1',
			},
		])
		const result = await listUserProjects('user_42')
		expect(result).toHaveLength(1)
		expect(result[0].totalSubtasks).toBe(5)
		expect(result[0].builtSubtasks).toBe(3)
		expect(result[0].failedSubtasks).toBe(0)
		expect(result[0].nextCardTitle).toBe('Add chart')
		expect(result[0].totalMilestones).toBe(2)
		expect(result[0].completedMilestones).toBe(1)
		expect(result[0].lastBuildAt).toBeInstanceOf(Date)
		expect(result[0].createdAt).toBeInstanceOf(Date)
	})

	it('returns empty array when no projects exist', async () => {
		setExecuteResult([])
		const result = await listUserProjects('user_42')
		expect(result).toEqual([])
	})

	it('coerces null/undefined nextCardTitle to null', async () => {
		setExecuteResult([
			{
				id: 'bbb',
				name: 'Beta',
				last_build_at: null,
				preview_url: null,
				created_at: '2026-04-05T10:00:00Z',
				total_subtasks: '3',
				built_subtasks: '3',
				failed_subtasks: '0',
				next_card_title: null,
				total_milestones: '1',
				completed_milestones: '1',
			},
		])
		const result = await listUserProjects('user_42')
		expect(result[0].nextCardTitle).toBeNull()
		expect(result[0].lastBuildAt).toBeNull()
	})
})
