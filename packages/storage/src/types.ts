/**
 * Shared types for the ProjectStorage layer.
 *
 * This layer owns the source-of-truth for Meldar v3 projects: the normalized
 * Postgres tables (`projects`, `builds`, `build_files`, `project_files`) plus
 * the content-addressed R2 blob store. Everything the orchestrator knows
 * about file state flows through this module.
 *
 * Architecture record:
 *   docs/v3/engineering/data-engineer-review.md
 *   docs/v3/engineering/software-architect-review.md
 *   docs/v3/engineering/database-optimizer-review.md
 *   Memory: v3_storage_architecture.md
 */

/**
 * A file that lives (or will live) inside a project. Path is relative POSIX,
 * content is the raw bytes as a string (UTF-8 text at MVP; binary support
 * deferred).
 */
export type StorageFile = {
	readonly path: string
	readonly content: string
}

/**
 * A file row from the `project_files` table — the live working set.
 * Represents "what the sandbox should currently be seeing." Used on workspace
 * entry (Hot Path 1) and on rollback restores.
 */
export type ProjectFileRow = {
	readonly projectId: string
	readonly path: string
	readonly contentHash: string
	readonly sizeBytes: number
	readonly r2Key: string
	readonly version: number
}

/**
 * A file row from the `build_files` table — the per-build immutable manifest.
 * Used for rollback, diff, and historical queries. Written once per Build
 * commit and never updated.
 */
export type BuildFileRow = {
	readonly buildId: string
	readonly path: string
	readonly contentHash: string
	readonly sizeBytes: number
	readonly r2Key: string
}

/**
 * A Build event row. Each Build is a causally-traceable unit of work
 * (Sonnet prompt + model + kanban card → file set). Each Build = one future
 * git commit when Phase 2 ships GitHub export.
 */
export type BuildRow = {
	readonly id: string
	readonly projectId: string
	readonly parentBuildId: string | null
	readonly status: BuildStatus
	readonly triggeredBy: BuildTrigger
	readonly kanbanCardId: string | null
	readonly modelVersion: string | null
	readonly promptHash: string | null
	readonly tokenCost: number | null
	readonly errorMessage: string | null
	readonly createdAt: Date
	readonly completedAt: Date | null
}

export type BuildStatus = 'streaming' | 'completed' | 'failed' | 'rolled_back'
export type BuildTrigger =
	| 'template' // genesis build — project creation from starter
	| 'user_prompt' // user typed a free-form prompt
	| 'kanban_card' // user clicked Build on a kanban card
	| 'rollback' // explicit or automatic rollback synthesized as its own event
	| 'upload' // (phase 2) bulk reupload from offload-reupload feature

/**
 * A project row. `currentBuildId` is HEAD — rollback flips this pointer.
 */
export type ProjectRow = {
	readonly id: string
	readonly userId: string
	readonly name: string
	readonly templateId: string
	readonly tier: ProjectTier
	readonly currentBuildId: string | null
	readonly lastBuildAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
	readonly deletedAt: Date | null
}

export type ProjectTier = 'builder' | 'pro' | 'vip'

/**
 * Options for creating a genesis project (one-off at project birth).
 * Runs inside a single transaction that:
 *   1. Inserts the project row with current_build_id = NULL
 *   2. Inserts the genesis build (triggered_by = 'template', status = 'completed')
 *   3. Inserts build_files and project_files rows for each initialFile
 *   4. Updates the project to point current_build_id at the genesis build
 *
 * Uses the DEFERRABLE FK to make all of this atomic.
 */
export type CreateProjectOptions = {
	readonly userId: string
	readonly name: string
	readonly templateId: string
	readonly tier?: ProjectTier
	readonly initialFiles: readonly StorageFile[]
	readonly modelVersion?: string
}

/**
 * Options for beginning a new streaming Build. Called by the orchestrator at
 * the start of each kanban card execution.
 */
export type BeginBuildOptions = {
	readonly projectId: string
	readonly triggeredBy: BuildTrigger
	readonly kanbanCardId?: string
	readonly modelVersion?: string
	readonly promptHash?: string
}

/**
 * Build file cap, per founder decision 2026-04-06. Enforced at the storage
 * boundary — if Sonnet hallucinates 5000 files, the Build fails cleanly
 * before any R2 writes happen.
 */
export const MAX_FILES_PER_BUILD = 200 as const

/**
 * Max content size per file. 10 MiB is generous for text files and matches
 * the sandbox's per-file write cap from the Cloudflare spike.
 */
export const MAX_FILE_CONTENT_BYTES = 10 * 1024 * 1024
