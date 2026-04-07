/**
 * ProjectStorage — the adapter the orchestrator and workspace code use to
 * persist and retrieve project state.
 *
 * Every method in this interface is implemented by BOTH:
 *   - `PostgresProjectStorage` — the production impl backed by the v3 schema
 *     + a `BlobStorage` (R2 in production, in-memory in tests)
 *   - `InMemoryProjectStorage` — a pure in-memory impl for fast unit tests,
 *     early orchestrator development, and CI without a database
 *
 * Contract tests in `__tests__/contract.ts` run against both implementations
 * to guarantee behavioral equivalence.
 *
 * Transaction model: all multi-statement operations (createProject,
 * commitBuild, rollback) happen inside a single `db.batch()` call on the
 * neon-http driver. See `docs/v3/engineering/sprint-1-db-setup.md` for the
 * DEFERRABLE FK setup that makes the genesis flow atomic.
 */

import type {
	BeginBuildOptions,
	BuildRow,
	CreateProjectOptions,
	ProjectFileRow,
	ProjectRow,
	StorageFile,
} from './types'

/**
 * Handle to a new project, returned from {@link ProjectStorage.createProject}.
 * Contains enough state for the caller to immediately kick off a sandbox.
 */
export type CreatedProject = {
	readonly project: ProjectRow
	readonly genesisBuild: BuildRow
	readonly files: readonly ProjectFileRow[]
}

/**
 * Context for a streaming Build. Returned from {@link ProjectStorage.beginBuild}
 * and passed to the per-card execution loop. Holds an immutable buildId but
 * mutates internal counters as files are written.
 *
 * The context is a stateful handle — callers MUST call exactly one of
 * `commit()` or `fail()` to terminate the build. Forgetting to call either
 * leaves the build in `streaming` status, which the orphaned-build reaper
 * will eventually mark as failed.
 */
export interface BuildContext {
	readonly buildId: string
	readonly projectId: string

	/** Monotonic counter of how many files have been written so far. */
	readonly fileCount: number

	/**
	 * Write a single file into the in-flight build. Upserts into project_files
	 * (live working set) and inserts into build_files (immutable manifest).
	 * Content bytes go to the blob store under a content-addressed key.
	 *
	 * Throws:
	 * - {@link BuildFileLimitError} if this write would exceed MAX_FILES_PER_BUILD
	 * - {@link FileTooLargeError} if the content is larger than MAX_FILE_CONTENT_BYTES
	 * - {@link BuildNotStreamingError} if commit/fail was already called
	 * - {@link SandboxUnsafePathError} if the path fails safety validation
	 */
	writeFile(file: StorageFile): Promise<void>

	/**
	 * Finalize the build. Sets status='completed', flips the project's
	 * current_build_id, updates last_build_at. After commit(), no more
	 * writes are allowed on this context.
	 */
	commit(options?: { tokenCost?: number }): Promise<BuildRow>

	/**
	 * Mark the build as failed with a reason string. Leaves build_files in
	 * place (partial state) — the user can choose to rollback, retry, or
	 * continue on the next card. Does NOT flip current_build_id.
	 */
	fail(reason: string, options?: { tokenCost?: number }): Promise<BuildRow>
}

export interface ProjectStorage {
	/**
	 * Create a new project from a template with an initial file set. Runs in
	 * a single transaction:
	 *   1. INSERT project (current_build_id = NULL)
	 *   2. INSERT genesis build (triggered_by='template', status='completed')
	 *   3. INSERT build_files + project_files for each initial file
	 *   4. UPDATE project SET current_build_id = genesisBuild.id
	 *
	 * Content blobs are written to the blob store BEFORE the transaction
	 * commits (idempotent content-addressed writes are safe to retry).
	 *
	 * Throws:
	 * - {@link BuildFileLimitError} on > MAX_FILES_PER_BUILD
	 * - {@link FileTooLargeError} on any oversized file
	 * - {@link SandboxUnsafePathError} on any unsafe path
	 * - {@link BlobStorageError} if the blob store write fails
	 */
	createProject(options: CreateProjectOptions): Promise<CreatedProject>

	/**
	 * Fetch a project by id, with an ownership check. Throws
	 * {@link ProjectNotFoundError} if the project doesn't exist OR belongs
	 * to a different user (no existence leak).
	 */
	getProject(projectId: string, userId: string): Promise<ProjectRow>

	/**
	 * Fetch the live working set of files for a project. Used on workspace
	 * entry (cold rehydrate) and on sandbox restart. Returns file metadata
	 * only — the caller fetches bytes via the blob store as needed.
	 *
	 * Result is ordered by path (deterministic for snapshot tests).
	 */
	getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]>

	/**
	 * Fetch the file contents for a single file by path. Verifies the
	 * content hash on read. Throws {@link BlobIntegrityError} on mismatch,
	 * {@link BlobStorageError} if the blob is missing.
	 */
	readFile(projectId: string, path: string): Promise<string>

	/**
	 * Begin a new streaming Build. The returned {@link BuildContext} is the
	 * write handle for the duration of the Build. Only one streaming Build
	 * should be in flight per project at any time (enforced by convention
	 * at the orchestrator layer — we don't hard-block concurrent builds here
	 * because the orchestrator may want to queue them).
	 */
	beginBuild(options: BeginBuildOptions): Promise<BuildContext>

	/**
	 * Roll back a project to a specific prior build's file set. Creates a
	 * new Build row with `triggered_by='rollback'`, copies the target build's
	 * files into project_files (upsert), and flips current_build_id to the
	 * new rollback build.
	 *
	 * Recording the rollback as its own event (rather than just flipping
	 * the pointer) preserves lineage: "this state was reached by rolling
	 * back from X to Y on date Z". Important for the learning explainer
	 * and for Phase-2 GitHub export where each event becomes a commit.
	 *
	 * Throws {@link InvalidRollbackTargetError} if targetBuildId doesn't
	 * belong to this project or is already the current HEAD.
	 */
	rollback(projectId: string, targetBuildId: string): Promise<BuildRow>

	/**
	 * Fetch a single build row by id. Used by the learning explainer and
	 * debugging tools. Ownership check via projectId.
	 */
	getBuild(projectId: string, buildId: string): Promise<BuildRow>
}
