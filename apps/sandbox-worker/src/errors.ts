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
	/** True when the throw site already emitted a structured log for this
	 *  failure; `mapSandboxError` skips its free-text log in that case. */
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
