/**
 * PostgresProjectStorage — production ProjectStorage backed by the v3 schema
 * (Drizzle ORM + Neon HTTP driver) and an injected BlobStorage (R2 in
 * production, in-memory for tests).
 *
 * Behavioral parity with InMemoryProjectStorage is enforced via the shared
 * contract tests in `__tests__/provider-contract.ts`. Once a Neon test branch
 * is wired into CI, those same tests will run against this implementation.
 *
 * Transaction model: neon-http does NOT support interactive transactions
 * (`session.transaction()` throws "No transactions support in neon-http
 * driver"). It DOES support `db.batch([...])`, which atomically executes a
 * sequence of pre-built queries in a single HTTP request via Neon's batch
 * endpoint. We use batch() for all multi-statement operations.
 *
 * The trade-off: every multi-statement operation must compute its full plan
 * up front (no "INSERT and use the returned id"). We work around this by
 * generating UUIDs client-side via `crypto.randomUUID()` and threading them
 * through the batch.
 *
 * Architecture record:
 *   docs/v3/engineering/data-engineer-review.md
 *   docs/v3/engineering/software-architect-review.md
 *   docs/v3/engineering/database-optimizer-review.md
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

// Drizzle's `db.batch` requires `Readonly<[U, ...U[]]>`. A plain `T[]`
// can't narrow to that tuple shape after a length check, so the cast is
// centralized here behind a runtime guard. Pass a `context` label so the
// failure points at the specific call site.
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

	// ── createProject ─────────────────────────────────────────────────────

	async createProject(options: CreateProjectOptions): Promise<CreatedProject> {
		this.validateFileBatch(options.initialFiles)

		const projectId = crypto.randomUUID()
		const genesisBuildId = crypto.randomUUID()
		const now = new Date()
		const tier: ProjectTier = options.tier ?? 'builder'

		// Compute hashes + sizes BEFORE touching either store. Bail early on
		// any preflight failure (path safety, file too large, hash compute).
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

		// Write blobs FIRST (engineering review §write order). Content-addressed
		// puts are idempotent, so a partial failure is recoverable: retry the
		// whole createProject — same hashes → same blob keys → no duplicates.
		for (const p of prepared) {
			await this.blob.put(projectId, p.contentHash, p.content)
		}

		// Now the DB writes, all in one batch transaction:
		//   1. INSERT projects (current_build_id = NULL)
		//   2. INSERT genesis build (status='completed')
		//   3. INSERT build_files
		//   4. INSERT project_files
		//   5. UPDATE projects SET current_build_id = genesisBuildId
		//
		// The DEFERRABLE FK on projects.current_build_id makes this atomic.
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

		// Drizzle's batch() requires a tuple of length >=1. Compose it so the
		// queries that touch many rows (build_files, project_files) are unrolled.
		// To keep the batch cardinality bounded by file count, we issue them
		// one row per query. With MAX_FILES_PER_BUILD=200, the batch can have up
		// to ~404 statements — well within Neon's batch limits.
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

		// Construct the return value from in-memory data — no extra read.
		const project: ProjectRow = {
			id: projectId,
			userId: options.userId,
			name: options.name,
			templateId: options.templateId,
			tier,
			currentBuildId: genesisBuildId,
			lastBuildAt: now,
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

	// ── getProject ────────────────────────────────────────────────────────

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

	// ── getCurrentFiles ───────────────────────────────────────────────────

	async getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]> {
		// Note: this method intentionally does NOT check ownership. Callers
		// (orchestrator, sandbox restore) own the projectId because they
		// already authenticated via getProject(). Adding a join here would
		// pay an extra index hit on every workspace entry.
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

	// ── readFile ──────────────────────────────────────────────────────────

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

	// ── beginBuild ────────────────────────────────────────────────────────

	async beginBuild(options: BeginBuildOptions): Promise<BuildContext> {
		// Read the current HEAD to set parentBuildId. Single indexed lookup.
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

	// ── rollback ──────────────────────────────────────────────────────────

	async rollback(projectId: string, targetBuildId: string): Promise<BuildRow> {
		// Phase 1: read target build + current project + target's files.
		// We need all of this to compute the project_files diff before writing.
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

		// Fetch the target build's manifest + the current live file set.
		const [targetFiles, currentFiles] = await Promise.all([
			this.db.select().from(schema.buildFiles).where(eq(schema.buildFiles.buildId, targetBuildId)),
			this.db
				.select()
				.from(schema.projectFiles)
				.where(
					and(eq(schema.projectFiles.projectId, projectId), isNull(schema.projectFiles.deletedAt)),
				),
		])

		// Phase 2: compute the diff and build the write batch.
		const rollbackBuildId = crypto.randomUUID()
		const now = new Date()
		const targetByPath = new Map(targetFiles.map((f) => [f.path, f]))
		const currentByPath = new Map(currentFiles.map((f) => [f.path, f]))

		// Typed batch: every push site is checked against `BatchItem<'pg'>` so a
		// non-Drizzle value can't sneak in. The remaining unsafety is the
		// non-emptiness assertion at the `db.batch(...)` call below — Drizzle's
		// batch signature requires a non-empty tuple, which a runtime-built
		// array can't structurally satisfy. We assert it at the boundary.
		const writes: BatchItem<'pg'>[] = []

		// Insert the rollback build event.
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

		// Insert build_files for the rollback build (mirror of target).
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

		// For every path in target, upsert into project_files.
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

		// Soft-delete current files that aren't in target.
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

		// Flip HEAD.
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

	// ── getBuild ──────────────────────────────────────────────────────────

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

	// ── private helpers ───────────────────────────────────────────────────

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

		// File-cap check uses the in-memory seenPaths set. This is correct
		// because BuildContext is single-writer per Build by orchestrator
		// convention.
		const isNew = !this.seenPaths.has(file.path)
		if (isNew && this.seenPaths.size >= MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(this.seenPaths.size + 1, MAX_FILES_PER_BUILD, {
				projectId: this.projectId,
			})
		}

		// Verify the build is still streaming. Without this check, a stale
		// context could keep writing after a fail() from another code path.
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

		// Eager blob put: content-addressed PUTs are idempotent and dedup'd
		// by hash, so an aborted/failed build leaves at worst orphan blobs
		// (cleaned up by a future GC reaper). The thing we MUST NOT do here
		// is touch project_files: that's the live working set, and a
		// mid-build mutation would be visible via getCurrentFiles before
		// commit() and would corrupt HEAD on any subsequent failure. The
		// build's manifest (build_files) IS the staging area; commit()
		// flushes it into project_files atomically with the HEAD flip.
		await this.blob.put(this.projectId, contentHash, file.content)

		// Insert into build_files (the build's staged manifest). Composite
		// PK is (build_id, path); onConflictDoUpdate handles the dedup-by-
		// path-within-a-build case.
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

		// Read the build's staged manifest. This is the set of files we'll
		// flush into project_files in the same batch as the HEAD flip — that
		// is the "atomic publish" moment of a Build.
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

		// One upsert per staged file. Each row uses the partial unique index
		// `ux_project_files_project_path WHERE deleted_at IS NULL` for the
		// conflict target, so a re-write of the same path bumps `version`
		// instead of inserting a duplicate row.
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

		// All four operations land in one batch so the build, the file flush,
		// and the HEAD flip succeed or fail together. (Drizzle's `batch` on
		// neon-http executes statements in a single HTTP request inside one
		// implicit transaction; the deferred FK on projects.current_build_id
		// + the partial unique index together make this safe.)
		const batch: BatchItem<'pg'>[] = [updateBuild, ...upsertProjectFiles, updateProject]
		await this.db.batch(assertNonEmptyBatch(batch, 'commit batch'))

		// Read back the committed row so the caller has accurate timestamps.
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
			// Lost the optimistic CAS — another process already terminated this build.
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

// ── row mappers ──────────────────────────────────────────────────────────────

function rowToProject(row: typeof schema.projects.$inferSelect): ProjectRow {
	return {
		id: row.id,
		userId: row.userId,
		name: row.name,
		templateId: row.templateId,
		tier: row.tier as ProjectTier,
		currentBuildId: row.currentBuildId,
		lastBuildAt: row.lastBuildAt,
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
