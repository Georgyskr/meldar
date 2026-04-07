/**
 * InMemoryProjectStorage — a pure in-memory implementation of ProjectStorage.
 *
 * Used for:
 *   - Fast unit tests of the orchestrator and workspace shell
 *   - Early integration tests before the real Postgres + R2 is wired up
 *   - CI runs that don't want to spin up a database
 *
 * Behaviors match PostgresProjectStorage via the shared contract tests in
 * `__tests__/contract.ts`. If the two ever diverge, the contract tests
 * catch it.
 *
 * NOT thread-safe. NOT for production. Explicitly throws if called in a
 * Node runtime flagged with NODE_ENV=production to catch accidental
 * mis-wiring.
 */

import { assertSafeSandboxPath } from '@meldar/sandbox'
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
	type StorageFile,
} from './types'

type InternalBuildFile = {
	buildId: string
	path: string
	contentHash: string
	sizeBytes: number
	r2Key: string
}

/**
 * Mutable in-memory shape for a project_files row. Intentionally NOT extending
 * the readonly `ProjectFileRow` so we can update fields in place during build
 * streaming. Converted via {@link toProjectFileRow} at the interface boundary.
 */
type InternalProjectFile = {
	id: string
	projectId: string
	path: string
	contentHash: string
	sizeBytes: number
	r2Key: string
	version: number
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

export class InMemoryProjectStorage implements ProjectStorage {
	private readonly projects = new Map<string, ProjectRow>()
	private readonly builds = new Map<string, BuildRow>()
	/** Keyed by buildId, value is an ordered list of files for that build. */
	private readonly buildFiles = new Map<string, InternalBuildFile[]>()
	/** Keyed by projectId, value is the live working set (only non-deleted rows). */
	private readonly projectFiles = new Map<string, InternalProjectFile[]>()

	constructor(private readonly blob: BlobStorage) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'InMemoryProjectStorage may not be constructed in production — use PostgresProjectStorage instead',
			)
		}
	}

	// ── createProject ─────────────────────────────────────────────────────

	async createProject(options: CreateProjectOptions): Promise<CreatedProject> {
		this.validateFileBatch(options.initialFiles)

		// Genesis invariants: client-generated IDs so the whole transaction is
		// observable as a single logical unit (matches how db.batch() works on
		// neon-http — IDs known up front, no interactive dependency).
		const projectId = crypto.randomUUID()
		const genesisBuildId = crypto.randomUUID()
		const now = new Date()

		const project: ProjectRow = {
			id: projectId,
			userId: options.userId,
			name: options.name,
			templateId: options.templateId,
			tier: options.tier ?? 'builder',
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

		// Write blobs first. Content-addressed writes are idempotent so retries
		// are safe. If blob writes fail, no Postgres rows exist yet — clean
		// abort, no cleanup needed.
		const fileRows: InternalProjectFile[] = []
		const buildFileRows: InternalBuildFile[] = []

		for (const file of options.initialFiles) {
			const contentHash = await sha256Hex(file.content)
			const sizeBytes = byteLength(file.content)
			const r2Key = `projects/${projectId}/content/${contentHash}`

			await this.blob.put(projectId, contentHash, file.content)

			const buildFile: InternalBuildFile = {
				buildId: genesisBuildId,
				path: file.path,
				contentHash,
				sizeBytes,
				r2Key,
			}
			buildFileRows.push(buildFile)

			fileRows.push({
				id: crypto.randomUUID(),
				projectId,
				path: file.path,
				contentHash,
				sizeBytes,
				r2Key,
				version: 1,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			})
		}

		this.projects.set(projectId, project)
		this.builds.set(genesisBuildId, genesisBuild)
		this.buildFiles.set(genesisBuildId, buildFileRows)
		this.projectFiles.set(projectId, fileRows)

		return {
			project,
			genesisBuild,
			files: fileRows.map(toProjectFileRow),
		}
	}

	// ── getProject ────────────────────────────────────────────────────────

	async getProject(projectId: string, userId: string): Promise<ProjectRow> {
		const project = this.projects.get(projectId)
		if (!project || project.userId !== userId || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		return project
	}

	// ── getCurrentFiles ───────────────────────────────────────────────────

	async getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]> {
		if (!this.projects.has(projectId)) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const files = this.projectFiles.get(projectId) ?? []
		return files
			.filter((f) => f.deletedAt === null)
			.map(toProjectFileRow)
			.sort((a, b) => a.path.localeCompare(b.path))
	}

	// ── readFile ──────────────────────────────────────────────────────────

	async readFile(projectId: string, path: string): Promise<string> {
		const files = this.projectFiles.get(projectId) ?? []
		const file = files.find((f) => f.path === path && f.deletedAt === null)
		if (!file) {
			throw new ProjectNotFoundError(`file not found: ${path}`, { projectId })
		}
		return this.blob.get(projectId, file.contentHash, { verify: true })
	}

	// ── beginBuild ────────────────────────────────────────────────────────

	async beginBuild(options: BeginBuildOptions): Promise<BuildContext> {
		const project = this.projects.get(options.projectId)
		if (!project || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${options.projectId}`, {
				projectId: options.projectId,
			})
		}

		const buildId = crypto.randomUUID()
		const now = new Date()

		const build: BuildRow = {
			id: buildId,
			projectId: options.projectId,
			parentBuildId: project.currentBuildId,
			status: 'streaming',
			triggeredBy: options.triggeredBy,
			kanbanCardId: options.kanbanCardId ?? null,
			modelVersion: options.modelVersion ?? null,
			promptHash: options.promptHash ?? null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: null,
		}

		this.builds.set(buildId, build)
		this.buildFiles.set(buildId, [])

		return new InMemoryBuildContext(this, buildId, options.projectId)
	}

	// ── rollback ──────────────────────────────────────────────────────────

	async rollback(projectId: string, targetBuildId: string): Promise<BuildRow> {
		const project = this.projects.get(projectId)
		if (!project || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const target = this.builds.get(targetBuildId)
		if (!target || target.projectId !== projectId) {
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

		const targetFiles = this.buildFiles.get(targetBuildId) ?? []
		const now = new Date()
		const rollbackBuildId = crypto.randomUUID()

		// Synthesize the rollback as its own build event for lineage.
		const rollbackBuild: BuildRow = {
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

		// Copy the target's files as the rollback build's manifest.
		const rollbackBuildFiles: InternalBuildFile[] = targetFiles.map((f) => ({
			...f,
			buildId: rollbackBuildId,
		}))

		// Rewrite project_files to exactly match the target build's file set.
		// Any live file not in the target is soft-deleted; any file in the
		// target that isn't live is re-added; existing files are updated to
		// point at the target's content hash.
		const currentFiles = this.projectFiles.get(projectId) ?? []
		const targetPathsToHashes = new Map(
			targetFiles.map((f) => [
				f.path,
				{ contentHash: f.contentHash, r2Key: f.r2Key, sizeBytes: f.sizeBytes },
			]),
		)
		const nextFiles: InternalProjectFile[] = []

		// Start from current files, update or soft-delete.
		for (const current of currentFiles) {
			const targetEntry = targetPathsToHashes.get(current.path)
			if (current.deletedAt !== null) {
				// Already soft-deleted. If the target has this path, un-delete.
				if (targetEntry) {
					nextFiles.push({
						...current,
						contentHash: targetEntry.contentHash,
						sizeBytes: targetEntry.sizeBytes,
						r2Key: targetEntry.r2Key,
						version: current.version + 1,
						updatedAt: now,
						deletedAt: null,
					})
					targetPathsToHashes.delete(current.path)
				} else {
					nextFiles.push(current) // stay deleted
				}
			} else if (targetEntry) {
				nextFiles.push({
					...current,
					contentHash: targetEntry.contentHash,
					sizeBytes: targetEntry.sizeBytes,
					r2Key: targetEntry.r2Key,
					version: current.version + 1,
					updatedAt: now,
				})
				targetPathsToHashes.delete(current.path)
			} else {
				// Path exists now but not in target — soft-delete.
				nextFiles.push({ ...current, deletedAt: now, updatedAt: now })
			}
		}

		// Any paths left in targetPathsToHashes are files the target had but
		// the current project has no row for at all — insert fresh rows.
		for (const [path, entry] of targetPathsToHashes) {
			nextFiles.push({
				id: crypto.randomUUID(),
				projectId,
				path,
				contentHash: entry.contentHash,
				sizeBytes: entry.sizeBytes,
				r2Key: entry.r2Key,
				version: 1,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			})
		}

		this.builds.set(rollbackBuildId, rollbackBuild)
		this.buildFiles.set(rollbackBuildId, rollbackBuildFiles)
		this.projectFiles.set(projectId, nextFiles)
		this.projects.set(projectId, {
			...project,
			currentBuildId: rollbackBuildId,
			lastBuildAt: now,
			updatedAt: now,
		})

		return rollbackBuild
	}

	// ── getBuild ──────────────────────────────────────────────────────────

	async getBuild(projectId: string, buildId: string): Promise<BuildRow> {
		const build = this.builds.get(buildId)
		if (!build || build.projectId !== projectId) {
			throw new BuildNotFoundError(buildId, undefined, { projectId })
		}
		return build
	}

	// ── internal helpers used by InMemoryBuildContext ─────────────────────

	/** @internal */
	_getBuildOrThrow(buildId: string): BuildRow {
		const build = this.builds.get(buildId)
		if (!build) {
			throw new BuildNotFoundError(buildId)
		}
		return build
	}

	/** @internal */
	_setBuild(build: BuildRow): void {
		this.builds.set(build.id, build)
	}

	/** @internal */
	_getBuildFiles(buildId: string): InternalBuildFile[] {
		return this.buildFiles.get(buildId) ?? []
	}

	/** @internal */
	async _writeFileToBuild(buildId: string, projectId: string, file: StorageFile): Promise<void> {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, { projectId })
		}
		assertSafeSandboxPath(file.path, { projectId })
		if (byteLength(file.content) > MAX_FILE_CONTENT_BYTES) {
			throw new FileTooLargeError(file.path, byteLength(file.content), MAX_FILE_CONTENT_BYTES, {
				projectId,
			})
		}
		const existing = this.buildFiles.get(buildId) ?? []
		// Deduplicate by path within a build — if the orchestrator rewrites the
		// same path twice in one build, the second write replaces the first.
		const uniquePaths = new Set(existing.filter((f) => f.path !== file.path).map((f) => f.path))
		uniquePaths.add(file.path)
		if (uniquePaths.size > MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(uniquePaths.size, MAX_FILES_PER_BUILD, { projectId })
		}

		const contentHash = await sha256Hex(file.content)
		const sizeBytes = byteLength(file.content)
		const r2Key = `projects/${projectId}/content/${contentHash}`

		// Eager blob write is fine: content-addressed PUTs are idempotent and
		// dedup'd by hash, so an aborted/failed build leaves at worst orphan
		// blobs (cleaned up by a future GC reaper). The thing we MUST NOT do
		// is touch project_files here — that's the live working set, and a
		// mid-build mutation would be visible via getCurrentFiles before
		// commit. Stage in build_files only; commit() does the project_files
		// flush atomically.
		await this.blob.put(projectId, contentHash, file.content)

		// Append or replace in build_files (the staged manifest for THIS build).
		const filtered = existing.filter((f) => f.path !== file.path)
		filtered.push({ buildId, path: file.path, contentHash, sizeBytes, r2Key })
		this.buildFiles.set(buildId, filtered)
	}

	/** @internal */
	_commitBuild(buildId: string, tokenCost: number | undefined): BuildRow {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, {
				projectId: build.projectId,
			})
		}
		const now = new Date()

		// Atomically flush the build's staged manifest into the live working
		// set. The build's build_files entries are an INCREMENTAL change set:
		// each entry is an upsert into project_files, and paths the build did
		// NOT touch are left alone. This is the moment a Build becomes
		// observable via getCurrentFiles/readFile.
		const stagedFiles = this.buildFiles.get(buildId) ?? []
		const liveFiles = this.projectFiles.get(build.projectId) ?? []
		for (const staged of stagedFiles) {
			const existingFile = liveFiles.find((f) => f.path === staged.path && f.deletedAt === null)
			if (existingFile) {
				existingFile.contentHash = staged.contentHash
				existingFile.sizeBytes = staged.sizeBytes
				existingFile.r2Key = staged.r2Key
				existingFile.version += 1
				existingFile.updatedAt = now
			} else {
				liveFiles.push({
					id: crypto.randomUUID(),
					projectId: build.projectId,
					path: staged.path,
					contentHash: staged.contentHash,
					sizeBytes: staged.sizeBytes,
					r2Key: staged.r2Key,
					version: 1,
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
				})
			}
		}
		this.projectFiles.set(build.projectId, liveFiles)

		const committed: BuildRow = {
			...build,
			status: 'completed',
			tokenCost: tokenCost ?? build.tokenCost,
			completedAt: now,
		}
		this.builds.set(buildId, committed)

		// Flip current_build_id on the project + bump last_build_at.
		const project = this.projects.get(build.projectId)
		if (project) {
			this.projects.set(build.projectId, {
				...project,
				currentBuildId: buildId,
				lastBuildAt: now,
				updatedAt: now,
			})
		}

		return committed
	}

	/** @internal */
	_failBuild(buildId: string, reason: string, tokenCost: number | undefined): BuildRow {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, {
				projectId: build.projectId,
			})
		}
		const now = new Date()
		const failed: BuildRow = {
			...build,
			status: 'failed',
			tokenCost: tokenCost ?? build.tokenCost,
			errorMessage: reason,
			completedAt: now,
		}
		this.builds.set(buildId, failed)
		// Do NOT flip current_build_id — failed builds leave HEAD alone.
		return failed
	}

	// ── private ───────────────────────────────────────────────────────────

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

class InMemoryBuildContext implements BuildContext {
	constructor(
		private readonly storage: InMemoryProjectStorage,
		readonly buildId: string,
		readonly projectId: string,
	) {}

	get fileCount(): number {
		return this.storage._getBuildFiles(this.buildId).length
	}

	async writeFile(file: StorageFile): Promise<void> {
		await this.storage._writeFileToBuild(this.buildId, this.projectId, file)
	}

	async commit(options?: { tokenCost?: number }): Promise<BuildRow> {
		return this.storage._commitBuild(this.buildId, options?.tokenCost)
	}

	async fail(reason: string, options?: { tokenCost?: number }): Promise<BuildRow> {
		return this.storage._failBuild(this.buildId, reason, options?.tokenCost)
	}
}

function toProjectFileRow(f: InternalProjectFile): ProjectFileRow {
	return {
		projectId: f.projectId,
		path: f.path,
		contentHash: f.contentHash,
		sizeBytes: f.sizeBytes,
		r2Key: f.r2Key,
		version: f.version,
	}
}

function byteLength(content: string): number {
	return new TextEncoder().encode(content).length
}
