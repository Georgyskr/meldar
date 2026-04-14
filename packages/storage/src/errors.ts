/**
 * Typed errors emitted by the ProjectStorage layer.
 *
 * The orchestrator catches these specifically so the learning explainer can
 * surface accurate failure reasons in the workspace UI.
 */

export abstract class StorageError extends Error {
	abstract readonly code: string
	readonly projectId?: string

	constructor(message: string, options?: { cause?: unknown; projectId?: string }) {
		super(message, { cause: options?.cause })
		this.name = this.constructor.name
		this.projectId = options?.projectId
	}
}

/**
 * The project wasn't found in the database, OR the ownership check failed.
 * We deliberately don't distinguish between "doesn't exist" and "belongs to
 * someone else" to avoid leaking project existence across accounts.
 */
export class ProjectNotFoundError extends StorageError {
	readonly code = 'project_not_found'
}

/**
 * A streaming build is already active for this project — enforced at the DB
 * level by a partial unique index. Surfaces the race between the server-side
 * check and another concurrent beginBuild call.
 */
export class BuildInProgressError extends StorageError {
	readonly code = 'build_in_progress'
}

/**
 * The caller tried to operate on a Build that doesn't exist or belongs to a
 * different project than claimed.
 */
export class BuildNotFoundError extends StorageError {
	readonly code = 'build_not_found'
	readonly buildId: string

	constructor(
		buildId: string,
		message?: string,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(message ?? `build not found: ${buildId}`, options)
		this.buildId = buildId
	}
}

/**
 * The caller tried to write to a Build that isn't in `streaming` status.
 * Builds become immutable once committed or failed — this guards against
 * bugs where the orchestrator accidentally reuses a stale build context.
 */
export class BuildNotStreamingError extends StorageError {
	readonly code = 'build_not_streaming'
	readonly buildId: string
	readonly actualStatus: string

	constructor(
		buildId: string,
		actualStatus: string,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(`build ${buildId} is not streaming (status=${actualStatus})`, options)
		this.buildId = buildId
		this.actualStatus = actualStatus
	}
}

/**
 * A Build exceeded the per-build file count ceiling. Caps are configured in
 * `types.ts`. Never retryable — the orchestrator must truncate or fail the
 * whole Build.
 */
export class BuildFileLimitError extends StorageError {
	readonly code = 'build_file_limit_exceeded'
	readonly attempted: number
	readonly limit: number

	constructor(attempted: number, limit: number, options?: { cause?: unknown; projectId?: string }) {
		super(`build file limit exceeded: attempted=${attempted} limit=${limit}`, options)
		this.attempted = attempted
		this.limit = limit
	}
}

/**
 * A single file in a Build exceeded the per-file content size cap.
 */
export class FileTooLargeError extends StorageError {
	readonly code = 'file_too_large'
	readonly path: string
	readonly sizeBytes: number
	readonly limit: number

	constructor(
		path: string,
		sizeBytes: number,
		limit: number,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(`file ${path} is ${sizeBytes} bytes (limit ${limit})`, options)
		this.path = path
		this.sizeBytes = sizeBytes
		this.limit = limit
	}
}

/**
 * The blob store failed a put/get. Usually transient (R2 network blip) but
 * not always (e.g., quota exceeded).
 */
export class BlobStorageError extends StorageError {
	readonly code = 'blob_storage_error'
	readonly operation: 'put' | 'get' | 'exists' | 'delete'

	constructor(
		operation: 'put' | 'get' | 'exists' | 'delete',
		message: string,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(message, options)
		this.operation = operation
	}
}

/**
 * A content-hash integrity check failed: the bytes fetched from the blob
 * store do not hash to the key they were stored under. This should never
 * happen under normal operation and indicates corruption.
 */
export class BlobIntegrityError extends StorageError {
	readonly code = 'blob_integrity_error'
	readonly expectedHash: string
	readonly actualHash: string

	constructor(
		expectedHash: string,
		actualHash: string,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(`blob integrity check failed: expected ${expectedHash} got ${actualHash}`, options)
		this.expectedHash = expectedHash
		this.actualHash = actualHash
	}
}

/**
 * Rollback target is not a valid build for this project (wrong project,
 * doesn't exist, or is already the current HEAD).
 */
export class InvalidRollbackTargetError extends StorageError {
	readonly code = 'invalid_rollback_target'
	readonly targetBuildId: string

	constructor(
		targetBuildId: string,
		message: string,
		options?: { cause?: unknown; projectId?: string },
	) {
		super(message, options)
		this.targetBuildId = targetBuildId
	}
}
