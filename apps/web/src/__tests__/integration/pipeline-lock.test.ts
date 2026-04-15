import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	acquirePipelineLock,
	isPipelineActive,
	releasePipelineLock,
} from '@/server/lib/pipeline-lock'
import {
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	HAS_DATABASE,
} from './setup'

describe.skipIf(!HAS_DATABASE)('pipeline-lock', () => {
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

	it('first acquire succeeds; second acquire on same project fails with pipeline_active', async () => {
		const a = await acquirePipelineLock(projectId)
		expect(a.ok).toBe(true)

		const b = await acquirePipelineLock(projectId)
		expect(b.ok).toBe(false)
		if (!b.ok) expect(b.reason).toBe('pipeline_active')

		if (a.ok) await releasePipelineLock(projectId, a.pipelineId)
	})

	it('after release, a new acquire succeeds', async () => {
		const a = await acquirePipelineLock(projectId)
		expect(a.ok).toBe(true)
		if (a.ok) await releasePipelineLock(projectId, a.pipelineId)

		const b = await acquirePipelineLock(projectId)
		expect(b.ok).toBe(true)
		if (b.ok) await releasePipelineLock(projectId, b.pipelineId)
	})

	it('isPipelineActive reflects the lock state', async () => {
		expect(await isPipelineActive(projectId)).toBe(false)

		const a = await acquirePipelineLock(projectId)
		expect(a.ok).toBe(true)
		expect(await isPipelineActive(projectId)).toBe(true)

		if (a.ok) await releasePipelineLock(projectId, a.pipelineId)
		expect(await isPipelineActive(projectId)).toBe(false)
	})

	it('release with wrong pipelineId is a no-op (does not unlock another holder)', async () => {
		const a = await acquirePipelineLock(projectId)
		expect(a.ok).toBe(true)

		await releasePipelineLock(projectId, '00000000-0000-0000-0000-000000000000')
		expect(await isPipelineActive(projectId)).toBe(true)

		if (a.ok) await releasePipelineLock(projectId, a.pipelineId)
	})

	it('returns project_not_found for a nonexistent project', async () => {
		const result = await acquirePipelineLock('00000000-0000-0000-0000-000000000000')
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.reason).toBe('project_not_found')
	})

	it('two concurrent acquires: only one wins', async () => {
		// Make sure no lock is held first.
		const a = await acquirePipelineLock(projectId)
		if (a.ok) await releasePipelineLock(projectId, a.pipelineId)

		const [r1, r2] = await Promise.all([
			acquirePipelineLock(projectId),
			acquirePipelineLock(projectId),
		])
		const wins = [r1, r2].filter((r) => r.ok)
		const losses = [r1, r2].filter((r) => !r.ok)
		expect(wins).toHaveLength(1)
		expect(losses).toHaveLength(1)

		const winner = wins[0]
		if (winner?.ok) await releasePipelineLock(projectId, winner.pipelineId)
	})
})
