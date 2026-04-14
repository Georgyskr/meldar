export type WorkerErrorCode =
	| 'DEV_SERVER_PROBE_FAILED'
	| 'DEV_SERVER_TIMEOUT'
	| 'CONFLICT'
	| 'NOT_FOUND'
	| 'QUOTA_EXHAUSTED'
	| 'WRITE_FAILED'
	| 'BAD_REQUEST'
	| 'UNAUTHORIZED'
	| 'INVALID_PROJECT_ID'
	| 'METHOD_NOT_ALLOWED'
	| 'CONFIG_ERROR'
	| 'INTERNAL'

export class WorkerError extends Error {
	readonly code: WorkerErrorCode
	/**
	 * F3: set to true by throw sites that have ALREADY emitted a structured
	 * log (e.g. `sandbox.dev_server_ready` from ensureDevServer). The
	 * route-level `mapSandboxError` reads this to avoid a second console.error
	 * for the same failure. Structured log is the source of truth for
	 * dashboards; redundant free-text logs just create noise.
	 */
	readonly loggedAtSource: boolean

	constructor(
		code: WorkerErrorCode,
		message: string,
		options?: { cause?: unknown; loggedAtSource?: boolean },
	) {
		super(message, options)
		this.name = 'WorkerError'
		this.code = code
		this.loggedAtSource = options?.loggedAtSource ?? false
	}
}
