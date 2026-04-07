/**
 * Typed errors emitted by SandboxProvider implementations.
 *
 * The orchestrator catches these specifically (never `instanceof Error`) so
 * that the learning explainer can surface accurate failure reasons to the
 * user ("sandbox is busy" vs "your file path is unsafe" are very different
 * UX experiences).
 */

export abstract class SandboxError extends Error {
	abstract readonly code: string
	readonly projectId?: string

	constructor(message: string, options?: { cause?: unknown; projectId?: string }) {
		super(message, { cause: options?.cause })
		this.name = this.constructor.name
		this.projectId = options?.projectId
	}
}

/**
 * The sandbox could not be started — container image failed to pull, quota
 * exceeded, DO activation failed, or `next dev` crashed during boot.
 *
 * Retryable: usually yes. Orchestrator should retry once with exponential
 * backoff before surfacing to the user.
 */
export class SandboxStartFailedError extends SandboxError {
	readonly code = 'sandbox_start_failed'
}

/**
 * The sandbox was asked to operate on a project that isn't currently running.
 *
 * Retryable: no — caller must `start()` first. This is almost always a
 * programming error (missed await, stale handle) rather than a transient
 * fault.
 */
export class SandboxNotFoundError extends SandboxError {
	readonly code = 'sandbox_not_found'
}

/**
 * A file write into the sandbox failed. Includes which file so the orchestrator
 * can surface precise error context in the kanban card.
 *
 * Retryable: usually no — most write failures are deterministic (path
 * rejected by provider, disk full, content too large).
 */
export class SandboxWriteFailedError extends SandboxError {
	readonly code = 'sandbox_write_failed'
	readonly path: string

	constructor(message: string, options: { path: string; cause?: unknown; projectId?: string }) {
		super(message, { cause: options.cause, projectId: options.projectId })
		this.path = options.path
	}
}

/**
 * A file path violated the provider's safety invariants (contains "..",
 * absolute path, reserved path segment, or exceeds max length). This is
 * always caller error and never retryable.
 *
 * This error MUST be raised at the provider boundary before any I/O hits
 * the sandbox — untrusted paths from AI output are a primary attack surface.
 */
export class SandboxUnsafePathError extends SandboxError {
	readonly code = 'sandbox_unsafe_path'
	readonly path: string

	constructor(path: string, reason: string, options?: { projectId?: string }) {
		super(`Unsafe sandbox path rejected: ${path} (${reason})`, {
			projectId: options?.projectId,
		})
		this.path = path
	}
}

/**
 * The sandbox started but its dev server never became ready within the
 * provider's wait timeout. Distinct from {@link SandboxStartFailedError}
 * because the container itself is running — only the dev process is stuck.
 *
 * Retryable: the orchestrator should usually issue a stop + restart rather
 * than a plain retry, because the stuck process is holding the port.
 */
export class SandboxNotReadyError extends SandboxError {
	readonly code = 'sandbox_not_ready'
}
