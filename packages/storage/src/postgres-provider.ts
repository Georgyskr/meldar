/**
 * neon-http does NOT support interactive transactions (only `db.batch([...])`),
 * so all multi-statement operations compute their full plan up front and use
 * client-generated UUIDs threaded through the batch.
 */

import * as schema from '@meldar/db/schema'
import { assertSafeSandboxPath } from '@meldar/sandbox'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { type BlobStorage, sha256Hex } from './blob'
import {
	BuildFileLimitError,
	BuildNotFoundError,
	BuildNotStreamingError,
	FileTooLargeError,
	InvalidRollbackTargetError,
	ProjectNotFoundError,
} from './errors'
import type { BuildContext, CreatedProject, ProjectStorage } from './provider'
import {
	type BeginBuildOptions,
	type BuildRow,
	type CreateProjectOptions,
	MAX_FILE_CONTENT_BYTES,
	MAX_FILES_PER_BUILD,
	type ProjectFileRow,
	type ProjectRow,
	type ProjectTier,
	type StorageFile,
} from './types'

export type NeonDrizzleDb = ReturnType<typeof drizzleNeonHttp<typeof schema>>

// Drizzle's `db.batch` requires `Readonly<[U, ...U[]]>` — a plain `T[]` can't
// narrow to that tuple shape after a length check, so the runtime cast is
// centralized here.
export function assertNonEmptyBatch(
	items: BatchItem<'pg'>[],
	context: string,
): [BatchItem<'pg'>, ...BatchItem<'pg'>[]] {
	if (items.length === 0) {
		throw new Error(`Invariant violated: ${context} produced an empty batch.`)
	}
	return items as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]
}

export class PostgresProjectStorage implements ProjectStorage {
	constructor(
		private readonly db: NeonDrizzleDb,
		private readonly blob: BlobStorage,
	) {}

	async createProject(options: CreateProjectOptions): Promise<CreatedProject> {
		this.validateFileBatch(options.initialFiles)

		const projectId = crypto.randomUUID()
		const genesisBuildId = crypto.randomUUID()
		const now = new Date()
		const tier: ProjectTier = options.tier ?? 'builder'

		type Prepared = {
			path: string
			contentHash: string
			sizeBytes: number
			r2Key: string
			content: string
			projectFileId: string
		}
		const prepared: Prepared[] = []
		for (const file of options.initialFiles) {
			const contentHash = await sha256Hex(file.content)
			const sizeBytes = byteLength(file.content)
			prepared.push({
				path: file.path,
				contentHash,
				sizeBytes,
				r2Key: `projects/${projectId}/content/${contentHash}`,
				content: file.content,
				projectFileId: crypto.randomUUID(),
			})
		}

		// Blobs FIRST: content-addressed puts are idempotent so a partial
		// failure is recoverable by retrying createProject.
		for (const p of prepared) {
			await this.blob.put(projectId, p.contentHash, p.content)
		}

		// DB writes in one batch; the DEFERRABLE FK on projects.current_build_id
		// lets us insert with NULL HEAD and flip it inside the same transaction.
		const insertProject = this.db.insert(schema.projects).values({
			id: projectId,
			userId: options.userId,
			name: options.name,
			templateId: options.templateId,
			tier,
			currentBuildId: null,
			lastBuildAt: now,
			createdAt: now,
			updatedAt: now,
		})

		const insertBuild = this.db.insert(schema.builds).values({
			id: genesisBuildId,
			projectId,
			parentBuildId: null,
			status: 'completed',
			triggeredBy: 'template',
			modelVersion: options.modelVersion ?? null,
			createdAt: now,
			completedAt: now,
		})

		const updateHead = this.db
			.update(schema.projects)
			.set({ currentBuildId: genesisBuildId, updatedAt: now })
			.where(eq(schema.projects.id, projectId))

		const buildFileInserts = prepared.map((p) =>
			this.db.insert(schema.buildFiles).values({
				buildId: genesisBuildId,
				path: p.path,
				r2Key: p.r2Key,
				contentHash: p.contentHash,
				sizeBytes: p.sizeBytes,
			}),
		)
		const projectFileInserts = prepared.map((p) =>
			this.db.insert(schema.projectFiles).values({
				id: p.projectFileId,
				projectId,
				path: p.path,
				r2Key: p.r2Key,
				contentHash: p.contentHash,
				sizeBytes: p.sizeBytes,
				version: 1,
				createdAt: now,
				updatedAt: now,
			}),
		)

		const batch: BatchItem<'pg'>[] = [
			insertProject,
			insertBuild,
			...buildFileInserts,
			...projectFileInserts,
			updateHead,
		]
		await this.db.batch(assertNonEmptyBatch(batch, 'createProject genesis batch'))

		const project: ProjectRow = {
			id: projectId,
			userId: options.userId,
			name: options.name,
			templateId: options.templateId,
			tier,
			currentBuildId: genesisBuildId,
			lastBuildAt: now,
			previewUrl: null,
			previewUrlUpdatedAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
		}
		const genesisBuild: BuildRow = {
			id: genesisBuildId,
			projectId,
			parentBuildId: null,
			status: 'completed',
			triggeredBy: 'template',
			kanbanCardId: null,
			modelVersion: options.modelVersion ?? null,
			promptHash: null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: now,
		}
		const files: ProjectFileRow[] = prepared.map((p) => ({
			projectId,
			path: p.path,
			contentHash: p.contentHash,
			sizeBytes: p.sizeBytes,
			r2Key: p.r2Key,
			version: 1,
		}))

		return { project, genesisBuild, files }
	}

	async getProject(projectId: string, userId: string): Promise<ProjectRow> {
		const rows = await this.db
			.select()
			.from(schema.projects)
			.where(
				and(
					eq(schema.projects.id, projectId),
					eq(schema.projects.userId, userId),
					isNull(schema.projects.deletedAt),
				),
			)
			.limit(1)
		const row = rows[0]
		if (!row) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		return rowToProject(row)
	}

	async getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]> {
		const rows = await this.db
			.select({
				projectId: schema.projectFiles.projectId,
				path: schema.projectFiles.path,
				contentHash: schema.projectFiles.contentHash,
				sizeBytes: schema.projectFiles.sizeBytes,
				r2Key: schema.projectFiles.r2Key,
				version: schema.projectFiles.version,
			})
			.from(schema.projectFiles)
			.where(
				and(eq(schema.projectFiles.projectId, projectId), isNull(schema.projectFiles.deletedAt)),
			)
			.orderBy(asc(schema.projectFiles.path))
		return rows
	}

	async readFile(projectId: string, path: string): Promise<string> {
		const rows = await this.db
			.select({ contentHash: schema.projectFiles.contentHash })
			.from(schema.projectFiles)
			.where(
				and(
					eq(schema.projectFiles.projectId, projectId),
					eq(schema.projectFiles.path, path),
					isNull(schema.projectFiles.deletedAt),
				),
			)
			.limit(1)
		const row = rows[0]
		if (!row) {
			throw new ProjectNotFoundError(`file not found: ${path}`, { projectId })
		}
		return this.blob.get(projectId, row.contentHash, { verify: true })
	}

	async beginBuild(options: BeginBuildOptions): Promise<BuildContext> {
		const projectRows = await this.db
			.select({ currentBuildId: schema.projects.currentBuildId })
			.from(schema.projects)
			.where(and(eq(schema.projects.id, options.projectId), isNull(schema.projects.deletedAt)))
			.limit(1)
		const project = projectRows[0]
		if (!project) {
			throw new ProjectNotFoundError(`project not found: ${options.projectId}`, {
				projectId: options.projectId,
			})
		}

		const buildId = crypto.randomUUID()
		const now = new Date()

		await this.db.insert(schema.builds).values({
			id: buildId,
			projectId: options.projectId,
			parentBuildId: project.currentBuildId,
			status: 'streaming',
			triggeredBy: options.triggeredBy,
			kanbanCardId: options.kanbanCardId ?? null,
			modelVersion: options.modelVersion ?? null,
			promptHash: options.promptHash ?? null,
			createdAt: now,
		})

		return new PostgresBuildContext(this.db, this.blob, buildId, options.projectId)
	}

	async rollback(projectId: string, targetBuildId: string): Promise<BuildRow> {
		const projectRows = await this.db
			.select()
			.from(schema.projects)
			.where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
			.limit(1)
		const project = projectRows[0]
		if (!project) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}

		const targetRows = await this.db
			.select()
			.from(schema.builds)
			.where(and(eq(schema.builds.id, targetBuildId), eq(schema.builds.projectId, projectId)))
			.limit(1)
		const target = targetRows[0]
		if (!target) {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`build ${targetBuildId} does not belong to project ${projectId}`,
				{ projectId },
			)
		}
		if (project.currentBuildId === targetBuildId) {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`build ${targetBuildId} is already the current HEAD`,
				{ projectId },
			)
		}
		if (target.status !== 'completed' && target.status !== 'rolled_back') {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`cannot roll back to a ${target.status} build`,
				{ projectId },
			)
		}

		const [targetFiles, currentFiles] = await Promise.all([
			this.db.select().from(schema.buildFiles).where(eq(schema.buildFiles.buildId, targetBuildId)),
			this.db
				.select()
				.from(schema.projectFiles)
				.where(
					and(eq(schema.projectFiles.projectId, projectId), isNull(schema.projectFiles.deletedAt)),
				),
		])

		const rollbackBuildId = crypto.randomUUID()
		const now = new Date()
		const targetByPath = new Map(targetFiles.map((f) => [f.path, f]))
		const currentByPath = new Map(currentFiles.map((f) => [f.path, f]))

		const writes: BatchItem<'pg'>[] = []

		writes.push(
			this.db.insert(schema.builds).values({
				id: rollbackBuildId,
				projectId,
				parentBuildId: project.currentBuildId,
				status: 'completed',
				triggeredBy: 'rollback',
				createdAt: now,
				completedAt: now,
			}),
		)

		for (const tf of targetFiles) {
			writes.push(
				this.db.insert(schema.buildFiles).values({
					buildId: rollbackBuildId,
					path: tf.path,
					r2Key: tf.r2Key,
					contentHash: tf.contentHash,
					sizeBytes: tf.sizeBytes,
				}),
			)
		}

		for (const tf of targetFiles) {
			const existing = currentByPath.get(tf.path)
			if (existing) {
				writes.push(
					this.db
						.update(schema.projectFiles)
						.set({
							contentHash: tf.contentHash,
							sizeBytes: tf.sizeBytes,
							r2Key: tf.r2Key,
							version: existing.version + 1,
							updatedAt: now,
						})
						.where(eq(schema.projectFiles.id, existing.id)),
				)
			} else {
				writes.push(
					this.db.insert(schema.projectFiles).values({
						id: crypto.randomUUID(),
						projectId,
						path: tf.path,
						r2Key: tf.r2Key,
						contentHash: tf.contentHash,
						sizeBytes: tf.sizeBytes,
						version: 1,
						createdAt: now,
						updatedAt: now,
					}),
				)
			}
		}

		for (const cf of currentFiles) {
			if (!targetByPath.has(cf.path)) {
				writes.push(
					this.db
						.update(schema.projectFiles)
						.set({ deletedAt: now, updatedAt: now })
						.where(eq(schema.projectFiles.id, cf.id)),
				)
			}
		}

		writes.push(
			this.db
				.update(schema.projects)
				.set({ currentBuildId: rollbackBuildId, lastBuildAt: now, updatedAt: now })
				.where(eq(schema.projects.id, projectId)),
		)

		await this.db.batch(assertNonEmptyBatch(writes, 'rollbackTo writes'))

		return {
			id: rollbackBuildId,
			projectId,
			parentBuildId: project.currentBuildId,
			status: 'completed',
			triggeredBy: 'rollback',
			kanbanCardId: null,
			modelVersion: null,
			promptHash: null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: now,
		}
	}

	async getBuild(projectId: string, buildId: string): Promise<BuildRow> {
		const rows = await this.db
			.select()
			.from(schema.builds)
			.where(and(eq(schema.builds.id, buildId), eq(schema.builds.projectId, projectId)))
			.limit(1)
		const row = rows[0]
		if (!row) {
			throw new BuildNotFoundError(buildId, undefined, { projectId })
		}
		return rowToBuild(row)
	}

	async setPreviewUrl(projectId: string, url: string | null): Promise<void> {
		const now = new Date()
		const updates =
			url === null
				? { previewUrl: null, previewUrlUpdatedAt: null, updatedAt: now }
				: { previewUrl: url, previewUrlUpdatedAt: now, updatedAt: now }
		const updated = await this.db
			.update(schema.projects)
			.set(updates)
			.where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt)))
			.returning({ id: schema.projects.id })
		if (updated.length === 0) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
	}

	async reapStuckBuilds(projectId: string, olderThan: Date): Promise<number> {
		const now = new Date()
		const updated = await this.db
			.update(schema.builds)
			.set({
				status: 'failed',
				errorMessage: 'reaper: stuck streaming',
				completedAt: now,
			})
			.where(
				and(
					eq(schema.builds.projectId, projectId),
					eq(schema.builds.status, 'streaming'),
					sql`${schema.builds.createdAt} < ${olderThan}`,
				),
			)
			.returning({ id: schema.builds.id })
		return updated.length
	}

	async getActiveStreamingBuild(projectId: string): Promise<string | null> {
		const rows = await this.db
			.select({ id: schema.builds.id })
			.from(schema.builds)
			.where(and(eq(schema.builds.projectId, projectId), eq(schema.builds.status, 'streaming')))
			.orderBy(sql`${schema.builds.createdAt} DESC`)
			.limit(1)
		return rows[0]?.id ?? null
	}

	private validateFileBatch(files: readonly StorageFile[]): void {
		if (files.length > MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(files.length, MAX_FILES_PER_BUILD)
		}
		const paths = new Set<string>()
		for (const file of files) {
			assertSafeSandboxPath(file.path)
			if (paths.has(file.path)) {
				throw new Error(`duplicate path in initial file set: ${file.path}`)
			}
			paths.add(file.path)
			if (byteLength(file.content) > MAX_FILE_CONTENT_BYTES) {
				throw new FileTooLargeError(file.path, byteLength(file.content), MAX_FILE_CONTENT_BYTES)
			}
		}
	}
}

class PostgresBuildContext implements BuildContext {
	private _fileCount = 0
	private _terminated = false
	private readonly seenPaths = new Set<string>()

	constructor(
		private readonly db: NeonDrizzleDb,
		private readonly blob: BlobStorage,
		readonly buildId: string,
		readonly projectId: string,
	) {}

	get fileCount(): number {
		return this._fileCount
	}

	async writeFile(file: StorageFile): Promise<void> {
		if (this._terminated) {
			throw new BuildNotStreamingError(this.buildId, 'completed_or_failed', {
				projectId: this.projectId,
			})
		}
		assertSafeSandboxPath(file.path, { projectId: this.projectId })
		const sizeBytes = byteLength(file.content)
		if (sizeBytes > MAX_FILE_CONTENT_BYTES) {
			throw new FileTooLargeError(file.path, sizeBytes, MAX_FILE_CONTENT_BYTES, {
				projectId: this.projectId,
			})
		}

		const isNew = !this.seenPaths.has(file.path)
		if (isNew && this.seenPaths.size >= MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(this.seenPaths.size + 1, MAX_FILES_PER_BUILD, {
				projectId: this.projectId,
			})
		}

		const buildRows = await this.db
			.select({ status: schema.builds.status })
			.from(schema.builds)
			.where(eq(schema.builds.id, this.buildId))
			.limit(1)
		const buildRow = buildRows[0]
		if (!buildRow) {
			throw new BuildNotFoundError(this.buildId, undefined, { projectId: this.projectId })
		}
		if (buildRow.status !== 'streaming') {
			this._terminated = true
			throw new BuildNotStreamingError(this.buildId, buildRow.status, {
				projectId: this.projectId,
			})
		}

		const contentHash = await sha256Hex(file.content)
		const r2Key = `projects/${this.projectId}/content/${contentHash}`

		// MUST NOT touch project_files mid-build: that's the live HEAD set
		// and would leak partial state via getCurrentFiles. build_files is
		// the staging area; commit() flushes it atomically with the HEAD flip.
		await this.blob.put(this.projectId, contentHash, file.content)

		await this.db
			.insert(schema.buildFiles)
			.values({
				buildId: this.buildId,
				path: file.path,
				r2Key,
				contentHash,
				sizeBytes,
			})
			.onConflictDoUpdate({
				target: [schema.buildFiles.buildId, schema.buildFiles.path],
				set: { r2Key, contentHash, sizeBytes },
			})

		if (isNew) {
			this.seenPaths.add(file.path)
			this._fileCount += 1
		}
	}

	async commit(options?: { tokenCost?: number }): Promise<BuildRow> {
		if (this._terminated) {
			throw new BuildNotStreamingError(this.buildId, 'completed_or_failed', {
				projectId: this.projectId,
			})
		}
		this._terminated = true
		const now = new Date()

		const stagedFiles = await this.db
			.select({
				path: schema.buildFiles.path,
				r2Key: schema.buildFiles.r2Key,
				contentHash: schema.buildFiles.contentHash,
				sizeBytes: schema.buildFiles.sizeBytes,
			})
			.from(schema.buildFiles)
			.where(eq(schema.buildFiles.buildId, this.buildId))

		const updateBuild = this.db
			.update(schema.builds)
			.set({
				status: 'completed',
				tokenCost: options?.tokenCost ?? null,
				completedAt: now,
			})
			.where(and(eq(schema.builds.id, this.buildId), eq(schema.builds.status, 'streaming')))

		// Conflict target is the partial unique index
		// `ux_project_files_project_path WHERE deleted_at IS NULL`, so a
		// re-write of the same path bumps `version` instead of duplicating.
		const upsertProjectFiles = stagedFiles.map((staged) =>
			this.db
				.insert(schema.projectFiles)
				.values({
					id: crypto.randomUUID(),
					projectId: this.projectId,
					path: staged.path,
					r2Key: staged.r2Key,
					contentHash: staged.contentHash,
					sizeBytes: staged.sizeBytes,
					version: 1,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [schema.projectFiles.projectId, schema.projectFiles.path],
					targetWhere: isNull(schema.projectFiles.deletedAt),
					set: {
						r2Key: staged.r2Key,
						contentHash: staged.contentHash,
						sizeBytes: staged.sizeBytes,
						version: sql`${schema.projectFiles.version} + 1`,
						updatedAt: now,
					},
				}),
		)

		const updateProject = this.db
			.update(schema.projects)
			.set({ currentBuildId: this.buildId, lastBuildAt: now, updatedAt: now })
			.where(eq(schema.projects.id, this.projectId))

		const batch: BatchItem<'pg'>[] = [updateBuild, ...upsertProjectFiles, updateProject]
		await this.db.batch(assertNonEmptyBatch(batch, 'commit batch'))

		const rows = await this.db
			.select()
			.from(schema.builds)
			.where(eq(schema.builds.id, this.buildId))
			.limit(1)
		const row = rows[0]
		if (!row) {
			throw new BuildNotFoundError(this.buildId, undefined, { projectId: this.projectId })
		}
		if (row.status !== 'completed') {
			throw new BuildNotStreamingError(this.buildId, row.status, {
				projectId: this.projectId,
			})
		}
		return rowToBuild(row)
	}

	async fail(reason: string, options?: { tokenCost?: number }): Promise<BuildRow> {
		if (this._terminated) {
			throw new BuildNotStreamingError(this.buildId, 'completed_or_failed', {
				projectId: this.projectId,
			})
		}
		this._terminated = true
		const now = new Date()
		const updated = await this.db
			.update(schema.builds)
			.set({
				status: 'failed',
				tokenCost: options?.tokenCost ?? null,
				errorMessage: reason,
				completedAt: now,
			})
			.where(and(eq(schema.builds.id, this.buildId), eq(schema.builds.status, 'streaming')))
			.returning()
		const row = updated[0]
		if (!row) {
			throw new BuildNotFoundError(this.buildId, undefined, { projectId: this.projectId })
		}
		return rowToBuild(row)
	}
}

function rowToProject(row: typeof schema.projects.$inferSelect): ProjectRow {
	return {
		id: row.id,
		userId: row.userId,
		name: row.name,
		templateId: row.templateId,
		tier: row.tier as ProjectTier,
		currentBuildId: row.currentBuildId,
		lastBuildAt: row.lastBuildAt,
		previewUrl: row.previewUrl,
		previewUrlUpdatedAt: row.previewUrlUpdatedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt,
	}
}

function rowToBuild(row: typeof schema.builds.$inferSelect): BuildRow {
	return {
		id: row.id,
		projectId: row.projectId,
		parentBuildId: row.parentBuildId,
		status: row.status as BuildRow['status'],
		triggeredBy: row.triggeredBy as BuildRow['triggeredBy'],
		kanbanCardId: row.kanbanCardId,
		modelVersion: row.modelVersion,
		promptHash: row.promptHash,
		tokenCost: row.tokenCost,
		errorMessage: row.errorMessage,
		createdAt: row.createdAt,
		completedAt: row.completedAt,
	}
}

function byteLength(content: string): number {
	return new TextEncoder().encode(content).length
}
