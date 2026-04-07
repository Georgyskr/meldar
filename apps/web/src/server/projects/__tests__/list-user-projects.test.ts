import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetDb, recorder, pushRows } = vi.hoisted(() => {
	type Recorder = {
		getDbCalls: number
		fromTables: unknown[]
		whereArgs: unknown[]
		orderByArgs: unknown[][]
		clear(): void
	}
	const recorder: Recorder = {
		getDbCalls: 0,
		fromTables: [],
		whereArgs: [],
		orderByArgs: [],
		clear() {
			this.getDbCalls = 0
			this.fromTables = []
			this.whereArgs = []
			this.orderByArgs = []
		},
	}

	const rowsQueue: unknown[][] = []
	const pushRows = (rows: unknown[]) => rowsQueue.push(rows)

	const makeChain = (): Record<string, unknown> => {
		const chain: Record<string, unknown> = {
			from: (table: unknown) => {
				recorder.fromTables.push(table)
				return chain
			},
			where: (arg: unknown) => {
				recorder.whereArgs.push(arg)
				return chain
			},
			orderBy: (...args: unknown[]) => {
				recorder.orderByArgs.push(args)
				return Promise.resolve(rowsQueue.shift() ?? [])
			},
		}
		return chain
	}

	const fakeDb = {
		select: () => makeChain(),
	}

	const mockGetDb = vi.fn(() => {
		recorder.getDbCalls += 1
		return fakeDb
	})

	return { mockGetDb, recorder, pushRows }
})

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockGetDb(),
}))

import { listUserProjects } from '../list-user-projects'

const dialect = new PgDialect()

function renderSql(value: unknown): string {
	const { sql } = dialect.sqlToQuery(value as SQL)
	return sql
}

function renderQuery(value: unknown): { sql: string; params: unknown[] } {
	const { sql, params } = dialect.sqlToQuery(value as SQL)
	return { sql, params }
}

describe('listUserProjects', () => {
	beforeEach(() => {
		recorder.clear()
		mockGetDb.mockClear()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('calls getDb exactly once per invocation', async () => {
		await listUserProjects('user_42')
		expect(recorder.getDbCalls).toBe(1)
	})

	it('issues a SELECT against the projects table', async () => {
		await listUserProjects('user_42')
		expect(recorder.fromTables).toHaveLength(1)
		const table = recorder.fromTables[0]
		expect(table).toBeDefined()
		expect(typeof table).toBe('object')
	})

	it('scopes the WHERE clause to the supplied userId and excludes soft-deleted rows', async () => {
		await listUserProjects('user_42')
		expect(recorder.whereArgs).toHaveLength(1)
		const { sql: whereSql, params } = renderQuery(recorder.whereArgs[0])
		expect(whereSql).toMatch(/"user_id"/)
		expect(whereSql.toLowerCase()).toMatch(/"deleted_at"\s+is\s+null/)
		expect(whereSql.toLowerCase()).toContain('and')
		expect(params).toContain('user_42')
	})

	it('orders by last_build_at desc nulls last, then created_at desc', async () => {
		await listUserProjects('user_42')
		expect(recorder.orderByArgs).toHaveLength(1)
		const args = recorder.orderByArgs[0]
		expect(args.length).toBeGreaterThanOrEqual(2)
		const firstArg = renderSql(args[0]).toLowerCase()
		expect(firstArg).toContain('"last_build_at"')
		expect(firstArg).toContain('desc')
		expect(firstArg).toContain('nulls last')
		const secondArg = renderSql(args[1]).toLowerCase()
		expect(secondArg).toContain('"created_at"')
		expect(secondArg).toContain('desc')
	})

	it('returns the rows the database produced, untouched', async () => {
		const rows = [
			{
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Alpha',
				lastBuildAt: new Date('2026-04-06T10:00:00Z'),
				previewUrl: 'https://preview.example.com/alpha',
				createdAt: new Date('2026-04-05T10:00:00Z'),
			},
		]
		pushRows(rows)
		const result = await listUserProjects('user_42')
		expect(result).toEqual(rows)
	})
})
