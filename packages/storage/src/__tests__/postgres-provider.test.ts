import * as schema from '@meldar/db/schema'
import type { BatchItem } from 'drizzle-orm/batch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildFileLimitError } from '../errors'
import { InMemoryBlobStorage } from '../in-memory-blob'
import { assertNonEmptyBatch, PostgresProjectStorage } from '../postgres-provider'
import { MAX_FILES_PER_BUILD } from '../types'

type Op = 'insert' | 'update' | 'select'

type Recorder = {
	/** Every db.insert(table)/update(table)/select() call this run, in order. */
	calls: Array<{ op: Op; table: unknown }>
	/** Every db.batch([...]) call's array length, for sanity checks. */
	batchSizes: number[]
	/** Every `.set(values)` payload passed to an update chain, in order. */
	updateSets: Array<{ table: unknown; values: Record<string, unknown> }>
	clear(): void
}

type AnyRow = object

function makeFakeDb(): {
	db: unknown
	recorder: Recorder
	pushSelectResult<T extends AnyRow>(rows: T[]): void
	pushReturningResult<T extends AnyRow>(rows: T[]): void
} {
	const recorder: Recorder = {
		calls: [],
		batchSizes: [],
		updateSets: [],
		clear() {
			this.calls = []
			this.batchSizes = []
			this.updateSets = []
		},
	}

	const selectQueue: AnyRow[][] = []
	const returningQueue: AnyRow[][] = []

	const defaultSelect: Pick<typeof schema.builds.$inferSelect, 'status'>[] = [
		{ status: 'streaming' },
	]
	const defaultReturning: Pick<typeof schema.builds.$inferSelect, 'id' | 'status'>[] = [
		{ id: 'fake', status: 'completed' },
	]

	const nextSelect = (): AnyRow[] => selectQueue.shift() ?? defaultSelect
	const nextReturning = (): AnyRow[] => returningQueue.shift() ?? defaultReturning

	const makeSelectChain = (): unknown => {
		const chain: Record<string, unknown> = {
			from: () => chain,
			where: () => chain,
			limit: async () => nextSelect(),
			// biome-ignore lint/suspicious/noThenProperty: drizzle queries are thenables; awaiting `db.select().from(...)` skips `.limit()`.
			then: (resolve: (v: unknown) => unknown) => resolve(nextSelect()),
		}
		return chain
	}
	const makeUpdateChain = (table: unknown): unknown => {
		const chain: Record<string, unknown> = {
			set: (values: Record<string, unknown>) => {
				recorder.updateSets.push({ table, values })
				return chain
			},
			where: () => chain,
			returning: async () => nextReturning(),
		}
		return chain
	}
	const makeInsertChain = (): unknown => {
		const chain: Record<string, unknown> = {
			values: () => chain,
			onConflictDoUpdate: () => chain,
			onConflictDoNothing: () => chain,
			returning: async () => nextReturning(),
			// biome-ignore lint/suspicious/noThenProperty: drizzle inserts are thenables; awaiting `db.insert(...).values(...)` skips `.returning()`.
			then: (resolve: (v: unknown) => unknown) => resolve([]),
		}
		return chain
	}

	const db = {
		insert: (table: unknown) => {
			recorder.calls.push({ op: 'insert', table })
			return makeInsertChain()
		},
		update: (table: unknown) => {
			recorder.calls.push({ op: 'update', table })
			return makeUpdateChain(table)
		},
		select: () => {
			recorder.calls.push({ op: 'select', table: null })
			return makeSelectChain()
		},
		batch: vi.fn(async (queries: unknown[]) => {
			recorder.batchSizes.push(queries.length)
			return []
		}),
	}
	return {
		db,
		recorder,
		pushSelectResult<T extends AnyRow>(rows: T[]) {
			selectQueue.push(rows)
		},
		pushReturningResult<T extends AnyRow>(rows: T[]) {
			returningQueue.push(rows)
		},
	}
}

describe('PostgresProjectStorage — query shape', () => {
	let blob: InMemoryBlobStorage
	let recorder: Recorder
	// biome-ignore lint/suspicious/noExplicitAny: fake db structurally subtypes Drizzle at the call sites we exercise
	let db: any
	let pushSelectResult: <T extends object>(rows: T[]) => void
	let pushReturningResult: <T extends object>(rows: T[]) => void
	let storage: PostgresProjectStorage

	beforeEach(() => {
		blob = new InMemoryBlobStorage()
		const fake = makeFakeDb()
		db = fake.db
		recorder = fake.recorder
		pushSelectResult = fake.pushSelectResult
		pushReturningResult = fake.pushReturningResult
		storage = new PostgresProjectStorage(db, blob)
	})

	function queueBeginBuildAndWrite(): void {
		pushSelectResult<Pick<typeof schema.projects.$inferSelect, 'currentBuildId'>>([
			{ currentBuildId: null },
		])
		pushSelectResult<Pick<typeof schema.builds.$inferSelect, 'status'>>([{ status: 'streaming' }])
	}

	describe('writeFile (build atomicity)', () => {
		it('does NOT touch project_files during writeFile (only build_files)', async () => {
			queueBeginBuildAndWrite()
			const ctx = await storage.beginBuild({
				projectId: '11111111-1111-4111-8111-111111111111',
				triggeredBy: 'kanban_card',
			})
			recorder.clear()

			await ctx.writeFile({ path: 'src/app/page.tsx', content: 'hello' })

			const insertedTables = recorder.calls.filter((c) => c.op === 'insert').map((c) => c.table)
			expect(insertedTables).toContain(schema.buildFiles)
			expect(insertedTables).not.toContain(schema.projectFiles)

			const updatedTables = recorder.calls.filter((c) => c.op === 'update').map((c) => c.table)
			expect(updatedTables).not.toContain(schema.projectFiles)
		})

		it('DOES touch project_files during commit', async () => {
			queueBeginBuildAndWrite()
			pushSelectResult<Pick<typeof schema.builds.$inferSelect, 'status'>>([{ status: 'streaming' }])
			const ctx = await storage.beginBuild({
				projectId: '22222222-2222-4222-8222-222222222222',
				triggeredBy: 'kanban_card',
			})
			await ctx.writeFile({ path: 'src/a.tsx', content: 'a' })
			await ctx.writeFile({ path: 'src/b.tsx', content: 'b' })
			recorder.clear()

			pushSelectResult<
				Pick<typeof schema.buildFiles.$inferSelect, 'path' | 'r2Key' | 'contentHash' | 'sizeBytes'>
			>([
				{ path: 'src/a.tsx', r2Key: 'k1', contentHash: 'h1', sizeBytes: 1 },
				{ path: 'src/b.tsx', r2Key: 'k2', contentHash: 'h2', sizeBytes: 1 },
			])
			pushSelectResult<typeof schema.builds.$inferSelect>([
				{
					id: 'fake_build',
					projectId: 'fake_project',
					pipelineRunId: null,
					parentBuildId: null,
					status: 'completed',
					triggeredBy: 'kanban_card',
					kanbanCardId: null,
					modelVersion: null,
					promptHash: null,
					tokenCost: 100,
					errorMessage: null,
					previewProbeStatus: null,
					previewProbeBodyLength: null,
					previewProbeBodyPreview: null,
					createdAt: new Date(),
					completedAt: new Date(),
				},
			])

			await ctx.commit({ tokenCost: 100 })

			const insertedTables = recorder.calls.filter((c) => c.op === 'insert').map((c) => c.table)
			expect(insertedTables).toContain(schema.projectFiles)

			const updatedTables = recorder.calls.filter((c) => c.op === 'update').map((c) => c.table)
			expect(updatedTables).toContain(schema.builds)
			expect(updatedTables).toContain(schema.projects)
		})
	})

	describe('fail (build atomicity)', () => {
		it('does NOT touch project_files during fail', async () => {
			queueBeginBuildAndWrite()
			const ctx = await storage.beginBuild({
				projectId: '33333333-3333-4333-8333-333333333333',
				triggeredBy: 'kanban_card',
			})
			await ctx.writeFile({ path: 'src/a.tsx', content: 'a' })
			recorder.clear()

			pushReturningResult<typeof schema.builds.$inferSelect>([
				{
					id: 'fake_build',
					projectId: 'fake_project',
					pipelineRunId: null,
					parentBuildId: null,
					status: 'failed',
					triggeredBy: 'kanban_card',
					kanbanCardId: null,
					modelVersion: null,
					promptHash: null,
					tokenCost: null,
					errorMessage: 'Sonnet refused',
					previewProbeStatus: null,
					previewProbeBodyLength: null,
					previewProbeBodyPreview: null,
					createdAt: new Date(),
					completedAt: new Date(),
				},
			])

			await ctx.fail('Sonnet refused')

			const insertedTables = recorder.calls.filter((c) => c.op === 'insert').map((c) => c.table)
			expect(insertedTables).not.toContain(schema.projectFiles)

			const updatedTables = recorder.calls.filter((c) => c.op === 'update').map((c) => c.table)
			expect(updatedTables).not.toContain(schema.projectFiles)
			expect(updatedTables).toContain(schema.builds)
		})
	})

	describe('assertNonEmptyBatch', () => {
		it('returns the array as a non-empty tuple type when non-empty', () => {
			const writes: BatchItem<'pg'>[] = [
				// biome-ignore lint/suspicious/noExplicitAny: fake item is sufficient for the invariant test
				{ fake: 'query' } as any,
			]
			expect(assertNonEmptyBatch(writes, 'test-context')).toBe(writes)
		})

		it('throws with the context label when empty', () => {
			expect(() => assertNonEmptyBatch([], 'createProject genesis batch')).toThrow(
				/invariant.*createProject genesis batch/i,
			)
		})
	})

	describe('setPreviewUrl', () => {
		it('writes a fresh timestamp alongside a non-null URL', async () => {
			pushReturningResult<{ id: string }>([{ id: 'fake_project' }])
			await storage.setPreviewUrl(
				'55555555-5555-4555-8555-555555555555',
				'https://sandbox.example.com/p',
			)
			const setCall = recorder.updateSets.find((s) => s.table === schema.projects)
			expect(setCall).toBeDefined()
			expect(setCall?.values.previewUrl).toBe('https://sandbox.example.com/p')
			expect(setCall?.values.previewUrlUpdatedAt).toBeInstanceOf(Date)
		})

		it('nulls BOTH columns when called with null URL', async () => {
			pushReturningResult<{ id: string }>([{ id: 'fake_project' }])
			await storage.setPreviewUrl('66666666-6666-4666-8666-666666666666', null)
			const setCall = recorder.updateSets.find((s) => s.table === schema.projects)
			expect(setCall).toBeDefined()
			expect(setCall?.values.previewUrl).toBeNull()
			expect(setCall?.values.previewUrlUpdatedAt).toBeNull()
		})
	})

	describe('writeFile (file count cap)', () => {
		it('rejects the overflow write before any DB ops are issued', async () => {
			queueBeginBuildAndWrite()
			const ctx = await storage.beginBuild({
				projectId: '44444444-4444-4444-8444-444444444444',
				triggeredBy: 'kanban_card',
			})
			for (let i = 0; i < MAX_FILES_PER_BUILD; i += 1) {
				await ctx.writeFile({ path: `f${i}.ts`, content: String(i) })
			}
			expect(ctx.fileCount).toBe(MAX_FILES_PER_BUILD)
			recorder.clear()

			await expect(ctx.writeFile({ path: 'overflow.ts', content: 'one too many' })).rejects.toThrow(
				BuildFileLimitError,
			)

			expect(recorder.calls).toHaveLength(0)
			expect(ctx.fileCount).toBe(MAX_FILES_PER_BUILD)
		})
	})
})
