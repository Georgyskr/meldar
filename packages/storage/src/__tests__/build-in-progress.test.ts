import { describe, expect, it } from 'vitest'
import { BuildInProgressError } from '../errors'
import { InMemoryBlobStorage } from '../in-memory-blob'
import { InMemoryProjectStorage } from '../in-memory-provider'

describe('InMemoryProjectStorage build concurrency', () => {
	it('throws BuildInProgressError when a second beginBuild happens while the first is streaming', async () => {
		const blob = new InMemoryBlobStorage()
		const storage = new InMemoryProjectStorage(blob)

		const created = await storage.createProject({
			userId: 'user_1',
			name: 'X',
			templateId: 'next-landing-v1',
			initialFiles: [],
		})

		await storage.beginBuild({
			projectId: created.project.id,
			triggeredBy: 'user_prompt',
			modelVersion: 'claude-sonnet-4-6',
		})

		await expect(
			storage.beginBuild({
				projectId: created.project.id,
				triggeredBy: 'user_prompt',
				modelVersion: 'claude-sonnet-4-6',
			}),
		).rejects.toBeInstanceOf(BuildInProgressError)
	})

	it('allows a new beginBuild after the first is committed', async () => {
		const blob = new InMemoryBlobStorage()
		const storage = new InMemoryProjectStorage(blob)

		const created = await storage.createProject({
			userId: 'user_1',
			name: 'X',
			templateId: 'next-landing-v1',
			initialFiles: [],
		})

		const ctx1 = await storage.beginBuild({
			projectId: created.project.id,
			triggeredBy: 'user_prompt',
			modelVersion: 'claude-sonnet-4-6',
		})
		await ctx1.commit({ tokenCost: 10 })

		const ctx2 = await storage.beginBuild({
			projectId: created.project.id,
			triggeredBy: 'user_prompt',
			modelVersion: 'claude-sonnet-4-6',
		})
		expect(ctx2.buildId).not.toBe(ctx1.buildId)
	})
})
