import { SandboxUnsafePathError } from '@meldar/sandbox'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BlobStorage } from '../blob'
import {
	BuildFileLimitError,
	BuildNotFoundError,
	BuildNotStreamingError,
	FileTooLargeError,
	InvalidRollbackTargetError,
	ProjectNotFoundError,
} from '../errors'
import type { ProjectStorage } from '../provider'
import { MAX_FILES_PER_BUILD } from '../types'

export type ProjectStorageContractFactory = () => {
	storage: ProjectStorage
	blob: BlobStorage
	softDeleteProject: (projectId: string) => Promise<void>
}

export function runProjectStorageContract(
	name: string,
	factory: ProjectStorageContractFactory,
): void {
	describe(`ProjectStorage contract: ${name}`, () => {
		let storage: ProjectStorage
		let blob: BlobStorage
		let softDeleteProject: (projectId: string) => Promise<void>

		beforeEach(() => {
			const f = factory()
			storage = f.storage
			blob = f.blob
			softDeleteProject = f.softDeleteProject
		})

		describe('createProject', () => {
			it('creates a project with a genesis build and initial files', async () => {
				const result = await storage.createProject({
					userId: 'user_1',
					name: 'Test project',
					templateId: 'next-landing-v1',
					initialFiles: [
						{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
						{ path: 'package.json', content: '{"name":"test"}' },
					],
				})

				expect(result.project.id).toMatch(/[0-9a-f-]{36}/)
				expect(result.project.userId).toBe('user_1')
				expect(result.project.name).toBe('Test project')
				expect(result.project.templateId).toBe('next-landing-v1')
				expect(result.project.tier).toBe('builder')
				expect(result.project.currentBuildId).toBe(result.genesisBuild.id)
				expect(result.project.deletedAt).toBeNull()
				expect(result.project.lastBuildAt).not.toBeNull()

				expect(result.genesisBuild.triggeredBy).toBe('template')
				expect(result.genesisBuild.status).toBe('completed')
				expect(result.genesisBuild.parentBuildId).toBeNull()

				expect(result.files).toHaveLength(2)
				const paths = result.files.map((f) => f.path).sort()
				expect(paths).toEqual(['package.json', 'src/app/page.tsx'])
			})

			it('writes content to the blob store', async () => {
				const result = await storage.createProject({
					userId: 'user_1',
					name: 'Test',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'hello' }],
				})
				const hash = result.files[0].contentHash
				expect(await blob.exists(result.project.id, hash)).toBe(true)
				expect(await blob.get(result.project.id, hash, { verify: true })).toBe('hello')
			})

			it('rejects unsafe paths', async () => {
				await expect(
					storage.createProject({
						userId: 'user_1',
						name: 'Test',
						templateId: 'next-landing-v1',
						initialFiles: [{ path: '../etc/passwd', content: 'pwned' }],
					}),
				).rejects.toThrow(SandboxUnsafePathError)
			})

			it('rejects duplicate paths in the initial file set', async () => {
				await expect(
					storage.createProject({
						userId: 'user_1',
						name: 'Test',
						templateId: 'next-landing-v1',
						initialFiles: [
							{ path: 'a.ts', content: 'one' },
							{ path: 'a.ts', content: 'two' },
						],
					}),
				).rejects.toThrow(/duplicate path/i)
			})

			it('rejects file sets over the cap', async () => {
				const files = Array.from({ length: MAX_FILES_PER_BUILD + 1 }, (_, i) => ({
					path: `f${i}.ts`,
					content: 'x',
				}))
				await expect(
					storage.createProject({
						userId: 'user_1',
						name: 'Test',
						templateId: 'next-landing-v1',
						initialFiles: files,
					}),
				).rejects.toThrow(BuildFileLimitError)
			})

			it('rejects oversized files', async () => {
				const huge = 'x'.repeat(11 * 1024 * 1024) // 11 MiB > 10 MiB cap
				await expect(
					storage.createProject({
						userId: 'user_1',
						name: 'Test',
						templateId: 'next-landing-v1',
						initialFiles: [{ path: 'a.ts', content: huge }],
					}),
				).rejects.toThrow(FileTooLargeError)
			})
		})

		describe('getProject + getCurrentFiles', () => {
			it('fetches a created project', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'hi' }],
				})
				const fetched = await storage.getProject(created.project.id, 'user_1')
				expect(fetched.id).toBe(created.project.id)
			})

			it('throws ProjectNotFoundError for wrong user (no existence leak)', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'hi' }],
				})
				await expect(storage.getProject(created.project.id, 'user_2')).rejects.toThrow(
					ProjectNotFoundError,
				)
			})

			it('throws ProjectNotFoundError for nonexistent id', async () => {
				await expect(
					storage.getProject('11111111-1111-1111-1111-111111111111', 'user_1'),
				).rejects.toThrow(ProjectNotFoundError)
			})

			it('returns current files sorted by path', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [
						{ path: 'z.ts', content: 'z' },
						{ path: 'a.ts', content: 'a' },
						{ path: 'm.ts', content: 'm' },
					],
				})
				const files = await storage.getCurrentFiles(created.project.id)
				expect(files.map((f) => f.path)).toEqual(['a.ts', 'm.ts', 'z.ts'])
			})

			it('readFile returns the content and verifies integrity', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'hello.ts', content: 'world' }],
				})
				const content = await storage.readFile(created.project.id, 'hello.ts')
				expect(content).toBe('world')
			})
		})

		describe('build streaming', () => {
			it('writes files into a new build and commits HEAD', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'src/app/page.tsx', content: 'v0' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
					kanbanCardId: 'card_hero',
					modelVersion: 'claude-sonnet-4-6',
				})
				expect(ctx.fileCount).toBe(0)

				await ctx.writeFile({ path: 'src/app/page.tsx', content: 'v1' })
				expect(ctx.fileCount).toBe(1)

				await ctx.writeFile({ path: 'src/components/button.tsx', content: 'btn' })
				expect(ctx.fileCount).toBe(2)

				const committed = await ctx.commit({ tokenCost: 1234 })
				expect(committed.status).toBe('completed')
				expect(committed.tokenCost).toBe(1234)
				expect(committed.triggeredBy).toBe('kanban_card')

				const project = await storage.getProject(created.project.id, 'user_1')
				expect(project.currentBuildId).toBe(committed.id)

				const files = await storage.getCurrentFiles(created.project.id)
				expect(files).toHaveLength(2)
				const page = files.find((f) => f.path === 'src/app/page.tsx')
				expect(await storage.readFile(created.project.id, 'src/app/page.tsx')).toBe('v1')
				expect(page?.version).toBe(2) // bumped from the genesis v1
			})

			it('fail leaves HEAD alone and marks the build failed', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'page.tsx', content: 'v0' }],
				})
				const genesisId = created.genesisBuild.id
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'page.tsx', content: 'v1' })
				const failed = await ctx.fail('Sonnet crashed')
				expect(failed.status).toBe('failed')
				expect(failed.errorMessage).toBe('Sonnet crashed')

				const project = await storage.getProject(created.project.id, 'user_1')
				expect(project.currentBuildId).toBe(genesisId)
			})

			it('dedups file writes by path within a single build (last write wins)', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'x' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'a.ts', content: 'first' })
				await ctx.writeFile({ path: 'a.ts', content: 'second' })
				expect(ctx.fileCount).toBe(1) // dedup
				await ctx.commit()
				const content = await storage.readFile(created.project.id, 'a.ts')
				expect(content).toBe('second')
			})

			it('rejects writes to an already-committed build', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'x' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.commit()
				await expect(ctx.writeFile({ path: 'b.ts', content: 'x' })).rejects.toThrow(
					BuildNotStreamingError,
				)
			})

			it('rejects writes to a failed build', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'x' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.fail('stop')
				await expect(ctx.writeFile({ path: 'b.ts', content: 'x' })).rejects.toThrow(
					BuildNotStreamingError,
				)
			})

			it('rejects unsafe paths at write time', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'x' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await expect(ctx.writeFile({ path: '../etc/passwd', content: 'pwned' })).rejects.toThrow(
					SandboxUnsafePathError,
				)
			})

			it('does not leak mid-build writes to getCurrentFiles before commit', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'page.tsx', content: 'genesis' }],
				})

				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'page.tsx', content: 'WIP-not-committed' })
				await ctx.writeFile({ path: 'new.tsx', content: 'also-not-committed' })

				const liveFiles = await storage.getCurrentFiles(created.project.id)
				expect(liveFiles.map((f) => f.path).sort()).toEqual(['page.tsx'])

				expect(await storage.readFile(created.project.id, 'page.tsx')).toBe('genesis')
			})

			it('reverts mid-build writes if the build fails (live files unchanged)', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [
						{ path: 'page.tsx', content: 'genesis' },
						{ path: 'keep.tsx', content: 'genesis-keep' },
					],
				})

				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'page.tsx', content: 'WIP' })
				await ctx.writeFile({ path: 'new.tsx', content: 'staged-but-rejected' })
				await ctx.fail('Sonnet refused')

				const liveFiles = await storage.getCurrentFiles(created.project.id)
				expect(liveFiles.map((f) => f.path).sort()).toEqual(['keep.tsx', 'page.tsx'])
				expect(await storage.readFile(created.project.id, 'page.tsx')).toBe('genesis')
				expect(await storage.readFile(created.project.id, 'keep.tsx')).toBe('genesis-keep')
			})

			it('dedups blobs across builds when content is identical', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'x' }],
				})
				const hash = created.files[0].contentHash

				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'b.ts', content: 'x' }) // same bytes, different path
				await ctx.commit()

				const files = await storage.getCurrentFiles(created.project.id)
				const a = files.find((f) => f.path === 'a.ts')
				const b = files.find((f) => f.path === 'b.ts')
				expect(a?.contentHash).toBe(hash)
				expect(b?.contentHash).toBe(hash)
			})

			it('idempotent same-hash rewrite of an existing path bumps version but preserves content', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'page.tsx', content: 'hello' }],
				})
				const originalHash = created.files[0].contentHash
				const liveBefore = await storage.getCurrentFiles(created.project.id)
				const versionBefore = liveBefore.find((f) => f.path === 'page.tsx')?.version
				expect(versionBefore).toBe(1)

				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'page.tsx', content: 'hello' }) // same bytes
				expect(ctx.fileCount).toBe(1)
				await ctx.commit()

				const liveAfter = await storage.getCurrentFiles(created.project.id)
				const page = liveAfter.find((f) => f.path === 'page.tsx')
				expect(page?.contentHash).toBe(originalHash)
				expect(page?.version).toBe(2)
				expect(await storage.readFile(created.project.id, 'page.tsx')).toBe('hello')
			})

			it('rejects writeFile that would exceed MAX_FILES_PER_BUILD distinct paths', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'genesis.ts', content: 'g' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				for (let i = 0; i < MAX_FILES_PER_BUILD; i += 1) {
					await ctx.writeFile({ path: `f${i}.ts`, content: String(i) })
				}
				expect(ctx.fileCount).toBe(MAX_FILES_PER_BUILD)

				await expect(
					ctx.writeFile({ path: 'overflow.ts', content: 'one too many' }),
				).rejects.toThrow(BuildFileLimitError)

				expect(ctx.fileCount).toBe(MAX_FILES_PER_BUILD)
			})
		})

		describe('rollback', () => {
			it('restores the file set to a prior build and records a rollback event', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'page.tsx', content: 'genesis' }],
				})
				const genesisId = created.genesisBuild.id

				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.writeFile({ path: 'page.tsx', content: 'v2' })
				await ctx.writeFile({ path: 'button.tsx', content: 'btn' })
				const build2 = await ctx.commit()

				const rollback = await storage.rollback(created.project.id, genesisId)
				expect(rollback.triggeredBy).toBe('rollback')
				expect(rollback.status).toBe('completed')
				expect(rollback.parentBuildId).toBe(build2.id)

				const project = await storage.getProject(created.project.id, 'user_1')
				expect(project.currentBuildId).toBe(rollback.id)

				const files = await storage.getCurrentFiles(created.project.id)
				expect(files.map((f) => f.path)).toEqual(['page.tsx'])
				const content = await storage.readFile(created.project.id, 'page.tsx')
				expect(content).toBe('genesis')
			})

			it('rejects rollback to a build from a different project', async () => {
				const a = await storage.createProject({
					userId: 'user_1',
					name: 'A',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const b = await storage.createProject({
					userId: 'user_1',
					name: 'B',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'b.ts', content: 'b' }],
				})
				await expect(storage.rollback(a.project.id, b.genesisBuild.id)).rejects.toThrow(
					InvalidRollbackTargetError,
				)
			})

			it('rejects rollback to the current HEAD', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				await expect(storage.rollback(created.project.id, created.genesisBuild.id)).rejects.toThrow(
					InvalidRollbackTargetError,
				)
			})

			it('rejects rollback to a failed build', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				const failed = await ctx.fail('boom')
				await expect(storage.rollback(created.project.id, failed.id)).rejects.toThrow(
					InvalidRollbackTargetError,
				)
			})
		})

		describe('getBuild', () => {
			it('fetches a build by id', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const build = await storage.getBuild(created.project.id, created.genesisBuild.id)
				expect(build.id).toBe(created.genesisBuild.id)
			})

			it('throws BuildNotFoundError for unknown id', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				await expect(
					storage.getBuild(created.project.id, '22222222-2222-2222-2222-222222222222'),
				).rejects.toThrow(BuildNotFoundError)
			})
		})

		describe('preview URL', () => {
			it('starts as null on a fresh project', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const fetched = await storage.getProject(created.project.id, 'user_1')
				expect(fetched.previewUrl).toBeNull()
				expect(fetched.previewUrlUpdatedAt).toBeNull()
			})

			it('persists the URL via setPreviewUrl and bumps the timestamp', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const before = Date.now()
				await storage.setPreviewUrl(created.project.id, 'https://sandbox.example.com/preview-1')
				const fetched = await storage.getProject(created.project.id, 'user_1')
				expect(fetched.previewUrl).toBe('https://sandbox.example.com/preview-1')
				expect(fetched.previewUrlUpdatedAt).not.toBeNull()
				expect(fetched.previewUrlUpdatedAt?.getTime() ?? 0).toBeGreaterThanOrEqual(before)
			})

			it('clears the URL AND nulls the timestamp when called with null', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				await storage.setPreviewUrl(created.project.id, 'https://sandbox.example.com/p')
				const before = await storage.getProject(created.project.id, 'user_1')
				expect(before.previewUrl).toBe('https://sandbox.example.com/p')
				expect(before.previewUrlUpdatedAt).not.toBeNull()

				await storage.setPreviewUrl(created.project.id, null)
				const after = await storage.getProject(created.project.id, 'user_1')
				expect(after.previewUrl).toBeNull()
				expect(after.previewUrlUpdatedAt).toBeNull()
			})

			it('throws ProjectNotFoundError for an unknown project', async () => {
				await expect(
					storage.setPreviewUrl(
						'33333333-3333-3333-3333-333333333333',
						'https://sandbox.example.com/p',
					),
				).rejects.toThrow(ProjectNotFoundError)
			})

			it('throws ProjectNotFoundError on a soft-deleted project', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				await softDeleteProject(created.project.id)
				await expect(
					storage.setPreviewUrl(created.project.id, 'https://sandbox.example.com/p'),
				).rejects.toThrow(ProjectNotFoundError)
			})
		})

		describe('reapStuckBuilds', () => {
			it('returns 0 when no streaming build exists for the project', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const cutoff = new Date(Date.now() + 60_000)
				const reaped = await storage.reapStuckBuilds(created.project.id, cutoff)
				expect(reaped).toBe(0)
			})

			it('does not reap a streaming build younger than the cutoff', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				const cutoff = new Date(Date.now() - 60_000)
				const reaped = await storage.reapStuckBuilds(created.project.id, cutoff)
				expect(reaped).toBe(0)
				const build = await storage.getBuild(created.project.id, ctx.buildId)
				expect(build.status).toBe('streaming')
			})

			it('marks streaming builds older than the cutoff as failed and returns the count', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				const cutoff = new Date(Date.now() + 60_000)
				const reaped = await storage.reapStuckBuilds(created.project.id, cutoff)
				expect(reaped).toBe(1)
				const build = await storage.getBuild(created.project.id, ctx.buildId)
				expect(build.status).toBe('failed')
				expect(build.errorMessage).toBe('reaper: stuck streaming')
				expect(build.completedAt).not.toBeNull()
			})

			it('does not affect completed or failed builds', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const cutoff = new Date(Date.now() + 60_000)
				const reaped = await storage.reapStuckBuilds(created.project.id, cutoff)
				expect(reaped).toBe(0)
				const genesis = await storage.getBuild(created.project.id, created.genesisBuild.id)
				expect(genesis.status).toBe('completed')
			})

			it('uses strict < on createdAt — a build at exactly the cutoff is NOT reaped', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				const build = await storage.getBuild(created.project.id, ctx.buildId)
				const cutoffEqual = new Date(build.createdAt.getTime())
				const reapedAtBoundary = await storage.reapStuckBuilds(created.project.id, cutoffEqual)
				expect(reapedAtBoundary).toBe(0)
				const stillStreaming = await storage.getBuild(created.project.id, ctx.buildId)
				expect(stillStreaming.status).toBe('streaming')

				const cutoffOneMsLater = new Date(build.createdAt.getTime() + 1)
				const reapedJustAfter = await storage.reapStuckBuilds(created.project.id, cutoffOneMsLater)
				expect(reapedJustAfter).toBe(1)
				const reaped = await storage.getBuild(created.project.id, ctx.buildId)
				expect(reaped.status).toBe('failed')
			})

			it('only reaps builds for the specified project', async () => {
				const a = await storage.createProject({
					userId: 'user_1',
					name: 'A',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const b = await storage.createProject({
					userId: 'user_1',
					name: 'B',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'b.ts', content: 'b' }],
				})
				const aCtx = await storage.beginBuild({
					projectId: a.project.id,
					triggeredBy: 'kanban_card',
				})
				const bCtx = await storage.beginBuild({
					projectId: b.project.id,
					triggeredBy: 'kanban_card',
				})
				const cutoff = new Date(Date.now() + 60_000)
				const reaped = await storage.reapStuckBuilds(a.project.id, cutoff)
				expect(reaped).toBe(1)
				const aBuild = await storage.getBuild(a.project.id, aCtx.buildId)
				const bBuild = await storage.getBuild(b.project.id, bCtx.buildId)
				expect(aBuild.status).toBe('failed')
				expect(bBuild.status).toBe('streaming')
			})

			it('still reaps streaming builds on a soft-deleted project (FK cascade safety)', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await softDeleteProject(created.project.id)
				const cutoff = new Date(Date.now() + 60_000)
				const reaped = await storage.reapStuckBuilds(created.project.id, cutoff)
				expect(reaped).toBe(1)
				const build = await storage.getBuild(created.project.id, ctx.buildId)
				expect(build.status).toBe('failed')
			})
		})

		describe('getActiveStreamingBuild', () => {
			it('returns null when only completed builds exist', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const id = await storage.getActiveStreamingBuild(created.project.id)
				expect(id).toBeNull()
			})

			it('returns the id of an in-flight streaming build', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				const id = await storage.getActiveStreamingBuild(created.project.id)
				expect(id).toBe(ctx.buildId)
			})

			it('returns null after the streaming build is committed', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.commit()
				const id = await storage.getActiveStreamingBuild(created.project.id)
				expect(id).toBeNull()
			})

			it('returns null after the streaming build is failed', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await ctx.fail('boom')
				const id = await storage.getActiveStreamingBuild(created.project.id)
				expect(id).toBeNull()
			})

			it('still returns the streaming build id on a soft-deleted project', async () => {
				const created = await storage.createProject({
					userId: 'user_1',
					name: 'X',
					templateId: 'next-landing-v1',
					initialFiles: [{ path: 'a.ts', content: 'a' }],
				})
				const ctx = await storage.beginBuild({
					projectId: created.project.id,
					triggeredBy: 'kanban_card',
				})
				await softDeleteProject(created.project.id)
				const id = await storage.getActiveStreamingBuild(created.project.id)
				expect(id).toBe(ctx.buildId)
			})
		})
	})
}
