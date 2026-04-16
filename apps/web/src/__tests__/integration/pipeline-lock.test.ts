import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	endPipelineRun,
	findActivePipelineRun,
	heartbeatPipelineRun,
	startPipelineRun,
} from '@/server/lib/pipeline-lock'
import {
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	HAS_DATABASE,
} from './setup'

describe.skipIf(!HAS_DATABASE)('pipeline-lock (pipeline_runs table)', () => {
	let userId: string
	let projectId: string

	beforeAll(async () => {
		const user = await createTestUser()
		userId = user.id
		const project = await createTestProject(user.id)
		projectId = project.id
	})

	afterAll(async () => {
		await cleanupTestProject(projectId)
		await cleanupTestUser(userId)
	})

	it('first startPipelineRun succeeds; second on same project returns pipeline_active', async () => {
		const a = await startPipelineRun(projectId, userId, 'auto')
		expect(a.ok).toBe(true)

		const b = await startPipelineRun(projectId, userId, 'single')
		expect(b.ok).toBe(false)
		if (!b.ok) expect(b.reason).toBe('pipeline_active')

		if (a.ok) await endPipelineRun(a.pipelineId, 'succeeded')
	})

	it('after endPipelineRun, a new startPipelineRun succeeds', async () => {
		const a = await startPipelineRun(projectId, userId, 'auto')
		expect(a.ok).toBe(true)
		if (a.ok) await endPipelineRun(a.pipelineId, 'succeeded')

		const b = await startPipelineRun(projectId, userId, 'auto')
		expect(b.ok).toBe(true)
		if (b.ok) await endPipelineRun(b.pipelineId, 'succeeded')
	})

	it('findActivePipelineRun reflects the lock state', async () => {
		expect(await findActivePipelineRun(projectId)).toBeNull()

		const a = await startPipelineRun(projectId, userId, 'auto')
		expect(a.ok).toBe(true)
		const active = await findActivePipelineRun(projectId)
		expect(active).not.toBeNull()
		expect(active?.state).toBe('running')
		expect(active?.kind).toBe('auto')

		if (a.ok) await endPipelineRun(a.pipelineId, 'succeeded')
		expect(await findActivePipelineRun(projectId)).toBeNull()
	})

	it('endPipelineRun on already-terminal run is a no-op (idempotent)', async () => {
		const a = await startPipelineRun(projectId, userId, 'auto')
		expect(a.ok).toBe(true)
		if (!a.ok) return
		await endPipelineRun(a.pipelineId, 'succeeded')
		await endPipelineRun(a.pipelineId, 'failed', { errorCode: 'nope' })
		// second call must not resurrect the run or change error_code
		expect(await findActivePipelineRun(projectId)).toBeNull()
	})

	it('returns project_not_found for a nonexistent project', async () => {
		const result = await startPipelineRun('00000000-0000-0000-0000-000000000000', userId, 'auto')
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.reason).toBe('project_not_found')
	})

	it('two concurrent startPipelineRun: only one wins', async () => {
		const existing = await findActivePipelineRun(projectId)
		if (existing) await endPipelineRun(existing.id, 'succeeded')

		const [r1, r2] = await Promise.all([
			startPipelineRun(projectId, userId, 'auto'),
			startPipelineRun(projectId, userId, 'auto'),
		])
		const wins = [r1, r2].filter((r) => r.ok)
		const losses = [r1, r2].filter((r) => !r.ok)
		expect(wins).toHaveLength(1)
		expect(losses).toHaveLength(1)

		const winner = wins[0]
		if (winner?.ok) await endPipelineRun(winner.pipelineId, 'succeeded')
	})

	it('heartbeat keeps the run alive', async () => {
		const a = await startPipelineRun(projectId, userId, 'auto')
		expect(a.ok).toBe(true)
		if (!a.ok) return

		await heartbeatPipelineRun(a.pipelineId)
		const active = await findActivePipelineRun(projectId)
		expect(active?.id).toBe(a.pipelineId)

		await endPipelineRun(a.pipelineId, 'succeeded')
	})
})
