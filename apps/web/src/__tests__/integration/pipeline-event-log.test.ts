import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	appendPipelineEvent,
	getLatestSeq,
	readPipelineEventsSince,
} from '@/server/lib/pipeline-event-log'
import { endPipelineRun, startPipelineRun } from '@/server/lib/pipeline-lock'
import {
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	HAS_DATABASE,
} from './setup'

describe.skipIf(!HAS_DATABASE)('pipeline-event-log', () => {
	let userId: string
	let projectId: string
	let runId: string

	beforeAll(async () => {
		const user = await createTestUser()
		userId = user.id
		const project = await createTestProject(user.id)
		projectId = project.id
		const lock = await startPipelineRun(projectId, userId, 'auto')
		if (!lock.ok) throw new Error('unable to start run')
		runId = lock.pipelineId
	})

	afterAll(async () => {
		await endPipelineRun(runId, 'succeeded').catch(() => undefined)
		await cleanupTestProject(projectId)
		await cleanupTestUser(userId)
	})

	it('appends events with monotonic seq starting at 1', async () => {
		const seq1 = await appendPipelineEvent({
			runId,
			type: 'started',
			payload: { buildId: 'b1' },
		})
		expect(seq1).toBe(1)
		const seq2 = await appendPipelineEvent({ runId, type: 'file_written', payload: { path: 'x' } })
		expect(seq2).toBe(2)
		const seq3 = await appendPipelineEvent({ runId, type: 'committed', payload: { fileCount: 1 } })
		expect(seq3).toBe(3)
	})

	it('readPipelineEventsSince returns events after the given seq in order', async () => {
		const events = await readPipelineEventsSince(runId, 1)
		expect(events).toHaveLength(2)
		expect(events[0].type).toBe('file_written')
		expect(events[1].type).toBe('committed')
		expect(events[0].seq).toBe(2)
		expect(events[1].seq).toBe(3)
	})

	it('readPipelineEventsSince with 0 returns all events', async () => {
		const events = await readPipelineEventsSince(runId, 0)
		expect(events).toHaveLength(3)
		expect(events.map((e) => e.seq)).toEqual([1, 2, 3])
	})

	it('getLatestSeq returns the max seq for the run', async () => {
		const latest = await getLatestSeq(runId)
		expect(latest).toBe(3)
	})

	it('getLatestSeq returns 0 for a run with no events', async () => {
		const lock = await startPipelineRun(projectId, userId, 'single')
		if (lock.ok) {
			try {
				expect(await getLatestSeq(lock.pipelineId)).toBe(0)
			} finally {
				await endPipelineRun(lock.pipelineId, 'succeeded')
			}
		}
	})

	it('truncates oversized payloads instead of failing (payload cap)', async () => {
		const p = await createTestProject(userId)
		const lock = await startPipelineRun(p.id, userId, 'auto')
		if (!lock.ok) throw new Error('lock failed')
		try {
			const huge = 'x'.repeat(100_000)
			const seq = await appendPipelineEvent({
				runId: lock.pipelineId,
				type: 'file_written',
				payload: { type: 'file_written', path: 'p', content: huge },
			})
			expect(seq).toBeGreaterThan(0)
			const events = await readPipelineEventsSince(lock.pipelineId, 0)
			const stored = events[0].payload as { content: string; _truncated?: boolean }
			expect(stored._truncated).toBe(true)
			expect(stored.content.length).toBeLessThan(70_000)
		} finally {
			await endPipelineRun(lock.pipelineId, 'succeeded')
			await cleanupTestProject(p.id)
		}
	})

	it('retries on unique-violation (concurrent writers both get seq)', async () => {
		const p = await createTestProject(userId)
		const lock = await startPipelineRun(p.id, userId, 'auto')
		if (!lock.ok) throw new Error('lock failed')
		try {
			const [seqA, seqB] = await Promise.all([
				appendPipelineEvent({ runId: lock.pipelineId, type: 'a', payload: { type: 'a' } }),
				appendPipelineEvent({ runId: lock.pipelineId, type: 'b', payload: { type: 'b' } }),
			])
			expect(seqA).toBeGreaterThan(0)
			expect(seqB).toBeGreaterThan(0)
			expect(seqA).not.toBe(seqB)
			const events = await readPipelineEventsSince(lock.pipelineId, 0)
			expect(events.map((e) => e.seq).sort()).toEqual([seqA, seqB].sort())
		} finally {
			await endPipelineRun(lock.pipelineId, 'succeeded')
			await cleanupTestProject(p.id)
		}
	})
})
