/**
 * CloudflareSandboxProvider — production SandboxProvider that talks to a
 * separately-deployed Cloudflare Worker over HTTP.
 *
 * Architecture:
 *   - Next.js app (Vercel) — orchestrator code, DB, R2 puts via S3 API
 *   - Cloudflare Worker     — wraps `@cloudflare/sandbox` (DOs + Containers),
 *                              exposes a small HTTP API the Next.js app calls
 *   - This provider          — the HTTP client between the two
 *
 * The Worker is a separate deployment from the Next.js app. The spike code in
 * `spikes/cloudflare-sandbox/` is the prototype; the production Worker is a
 * polished version (separate task) that adds:
 *   - Per-project Durable Object IDs (`project-${projectId}`)
 *   - Batch writeFile endpoint
 *   - HMAC request authentication
 *   - Idempotent prewarm endpoint
 *   - Health check endpoint
 *
 * Contract guarantees: see {@link SandboxProvider}. This impl satisfies all
 * of them by delegating to the Worker, which in turn delegates to the SDK.
 *
 * Required environment variables:
 *   CF_SANDBOX_WORKER_URL  — base URL of the deployed Worker, e.g.
 *                            'https://meldar-sandbox.example.workers.dev'
 *   CF_SANDBOX_HMAC_SECRET — shared secret for HMAC-signed request auth.
 *                            Must match the secret configured in the Worker
 *                            via `wrangler secret put HMAC_SECRET`.
 *
 * Why HMAC and not a bearer token: HMAC binds the signature to the request
 * body, so a leaked Authorization header can't be replayed against a
 * different payload. The spike Worker is public-by-design (no auth at all)
 * and unsuitable for production.
 */

import {
	SandboxError,
	SandboxNotFoundError,
	SandboxNotReadyError,
	SandboxStartFailedError,
	SandboxWriteFailedError,
} from './errors'
import type { SandboxProvider } from './provider'
import { assertSafeSandboxPath } from './safety'
import type { SandboxFile, SandboxHandle, StartSandboxOptions, WriteFilesOptions } from './types'

export type CloudflareSandboxProviderConfig = {
	/** Base URL of the Cloudflare Worker, e.g. 'https://meldar-sandbox.workers.dev'. */
	readonly workerUrl: string
	/** Shared HMAC secret matching the Worker's HMAC_SECRET env var. */
	readonly hmacSecret: string
	/** Request timeout in ms. Defaults to 30s (matches the worker's prewarm timeout). */
	readonly timeoutMs?: number
	/**
	 * Override fetch (test injection). Defaults to globalThis.fetch.
	 */
	readonly fetchImpl?: typeof globalThis.fetch
}

export class CloudflareSandboxProvider implements SandboxProvider {
	private readonly workerUrl: string
	private readonly hmacSecret: string
	private readonly timeoutMs: number
	private readonly fetchImpl: typeof globalThis.fetch

	constructor(config: CloudflareSandboxProviderConfig) {
		if (!config.workerUrl || !config.hmacSecret) {
			throw new Error('CloudflareSandboxProvider: workerUrl and hmacSecret are required')
		}
		this.workerUrl = config.workerUrl.replace(/\/$/, '')
		this.hmacSecret = config.hmacSecret
		// 120s ceiling: worker's ensureDevServer waits up to 90s for cold-start
		// container readiness; client must outlast that to receive the response.
		this.timeoutMs = config.timeoutMs ?? 120_000
		this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis)
	}

	static fromEnv(env: Record<string, string | undefined> = process.env): CloudflareSandboxProvider {
		const required = ['CF_SANDBOX_WORKER_URL', 'CF_SANDBOX_HMAC_SECRET']
		const missing = required.filter((k) => !env[k])
		if (missing.length > 0) {
			throw new Error(
				`CloudflareSandboxProvider.fromEnv: missing env vars: ${missing.join(', ')}. ` +
					`See src/server/sandbox/cloudflare-provider.ts for setup instructions.`,
			)
		}
		return new CloudflareSandboxProvider({
			workerUrl: env.CF_SANDBOX_WORKER_URL as string,
			hmacSecret: env.CF_SANDBOX_HMAC_SECRET as string,
		})
	}

	async prewarm(projectId: string, opts: { requestId?: string } = {}): Promise<void> {
		// Fire-and-forget semantics: log on failure, never throw. Callers
		// (Stripe webhook, magic-link click) rely on this.
		// requestId is optional so call-sites that don't have a correlation
		// context (webhooks) still work; the worker generates one if missing.
		try {
			await this.callWorker('POST', '/api/v1/prewarm', { projectId }, { requestId: opts.requestId })
		} catch (err) {
			console.warn(
				`[CloudflareSandboxProvider] prewarm(${projectId}) failed silently: ${formatErr(err)}`,
			)
		}
	}

	async start(options: StartSandboxOptions): Promise<SandboxHandle> {
		for (const file of options.initialFiles ?? []) {
			assertSafeSandboxPath(file.path, { projectId: options.projectId })
		}

		let response: WorkerStartResponse
		try {
			response = await this.callWorker<WorkerStartResponse>(
				'POST',
				'/api/v1/start',
				{
					projectId: options.projectId,
					userId: options.userId,
					files: options.initialFiles ?? [],
				},
				{ requestId: options.requestId, userId: options.userId },
			)
		} catch (err) {
			if (err instanceof SandboxError) throw err
			throw new SandboxStartFailedError(`worker /api/v1/start failed: ${formatErr(err)}`, {
				projectId: options.projectId,
				cause: err,
			})
		}

		if (!response.previewUrl || !response.sandboxId) {
			throw new SandboxStartFailedError(
				`worker returned malformed response: ${JSON.stringify(response)}`,
				{ projectId: options.projectId },
			)
		}

		return {
			projectId: options.projectId,
			previewUrl: response.previewUrl,
			status: response.status ?? 'ready',
		}
	}

	async writeFiles(options: WriteFilesOptions): Promise<SandboxHandle> {
		for (const file of options.files) {
			assertSafeSandboxPath(file.path, { projectId: options.projectId })
		}

		let response: WorkerWriteResponse
		try {
			response = await this.callWorker<WorkerWriteResponse>(
				'POST',
				'/api/v1/write',
				{
					projectId: options.projectId,
					files: options.files,
				},
				{ requestId: options.requestId, userId: options.userId },
			)
		} catch (err) {
			if (err instanceof SandboxError) throw err
			throw new SandboxWriteFailedError(`worker /api/v1/write failed: ${formatErr(err)}`, {
				path: options.files[0]?.path ?? '<unknown>',
				projectId: options.projectId,
				cause: err,
			})
		}

		if (response.failedPath) {
			throw new SandboxWriteFailedError(
				response.error ?? `worker reported file write failure: ${response.failedPath}`,
				{ path: response.failedPath, projectId: options.projectId },
			)
		}

		return {
			projectId: options.projectId,
			previewUrl: response.previewUrl,
			status: response.status ?? 'ready',
		}
	}

	async getPreviewUrl(projectId: string): Promise<string | null> {
		try {
			const response = await this.callWorker<WorkerStatusResponse>('POST', '/api/v1/status', {
				projectId,
			})
			return response.previewUrl ?? null
		} catch (err) {
			if (err instanceof SandboxNotFoundError) return null
			throw err
		}
	}

	async stop(projectId: string): Promise<void> {
		try {
			await this.callWorker('POST', '/api/v1/stop', { projectId })
		} catch (err) {
			// Stop is idempotent — a 404 from the Worker means "already stopped"
			// and is success. Other failures bubble up.
			if (err instanceof SandboxNotFoundError) return
			throw err
		}
	}

	private async callWorker<T = unknown>(
		method: 'POST' | 'GET',
		path: string,
		body: unknown,
		opts: { requestId?: string; userId?: string } = {},
	): Promise<T> {
		const url = `${this.workerUrl}${path}`
		const bodyJson = JSON.stringify(body)
		const timestamp = Date.now().toString()
		const signature = await hmacSign(this.hmacSecret, `${timestamp}.${bodyJson}`)
		const requestId = opts.requestId ?? generateRequestId()

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

		const headers: Record<string, string> = {
			'content-type': 'application/json',
			'x-meldar-timestamp': timestamp,
			'x-meldar-signature': signature,
			'x-meldar-request-id': requestId,
		}
		if (opts.userId) headers['x-meldar-user-id'] = opts.userId

		let res: Response
		try {
			res = await this.fetchImpl(url, {
				method,
				headers,
				body: bodyJson,
				signal: controller.signal,
			})
		} catch (err) {
			clearTimeout(timeoutId)
			if (err instanceof Error && err.name === 'AbortError') {
				throw new SandboxNotReadyError(`worker request timed out after ${this.timeoutMs}ms`, {
					cause: err,
				})
			}
			throw new SandboxStartFailedError(`worker request network error: ${formatErr(err)}`, {
				cause: err,
			})
		}
		clearTimeout(timeoutId)

		if (!res.ok) {
			throw await classifyWorkerError(res, path)
		}

		const json = await res.json()
		return json as T
	}
}

/**
 * Map a worker error response to the correct SandboxError subclass.
 *
 * P2-15: previously this code pattern-matched on HTTP status alone; now the
 * worker emits a tagged `{ error: CODE }` body that carries the precise
 * failure mode without any internal context (no `message`, no `stack`). We
 * dispatch on that code; if the body is unparseable or the code is unknown,
 * we fall back to status-based classification so older worker deployments
 * still get sane mapping during rolling upgrades.
 *
 * The body is bounded at 500 bytes for the fallback so a malicious or
 * malformed worker can't blow the orchestrator's error-message budget.
 */
async function classifyWorkerError(res: Response, path: string): Promise<SandboxError> {
	const rawBody = await res.text().catch(() => '')
	let code: string | undefined
	try {
		const parsed = JSON.parse(rawBody) as unknown
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'error' in parsed &&
			typeof (parsed as { error: unknown }).error === 'string'
		) {
			code = (parsed as { error: string }).error
		}
	} catch {
		// fallthrough — handled by status-based fallback below
	}

	switch (code) {
		case 'NOT_FOUND':
			return new SandboxNotFoundError(`worker NOT_FOUND for ${path}`)
		case 'CONFLICT':
			return new SandboxNotReadyError(`worker reported CONFLICT for ${path}`)
		case 'DEV_SERVER_TIMEOUT':
			return new SandboxNotReadyError(`worker dev server timed out for ${path}`)
		case 'QUOTA_EXHAUSTED':
			return new SandboxNotReadyError(`worker reported QUOTA_EXHAUSTED for ${path}`)
		case 'CONFIG_ERROR':
			// Worker is misconfigured (e.g. missing HMAC_SECRET). Surface as a
			// start-failure so the orchestrator's existing retry policy applies
			// and the on-call rotation sees the structured error log.
			return new SandboxStartFailedError(`worker reported CONFIG_ERROR for ${path}`)
		case 'UNAUTHORIZED':
			return new SandboxStartFailedError(`worker reported UNAUTHORIZED for ${path}`)
		case 'BAD_REQUEST':
		case 'INVALID_PROJECT_ID':
			return new SandboxStartFailedError(`worker reported ${code} for ${path}`)
		case 'WRITE_FAILED':
			return new SandboxWriteFailedError(`worker reported WRITE_FAILED`, {
				path: '<unknown>',
			})
	}

	// Fallback: legacy worker without tagged codes, or unknown body shape.
	// Map by HTTP status. Body is bounded so the orchestrator's logs stay
	// under control regardless of what the worker returned.
	const bodySnippet = rawBody.slice(0, 200)
	if (res.status === 404) {
		return new SandboxNotFoundError(`worker returned 404 for ${path}`)
	}
	if (res.status === 409) {
		return new SandboxNotReadyError(`worker returned 409 Conflict for ${path}`)
	}
	return new SandboxStartFailedError(
		`worker returned ${res.status} ${res.statusText} for ${path}` +
			(bodySnippet ? ` (body: ${bodySnippet})` : ''),
	)
}

type WorkerStartResponse = {
	sandboxId?: string
	previewUrl?: string
	status?: 'starting' | 'ready' | 'stopping' | 'stopped' | 'error'
}

type WorkerWriteResponse = {
	previewUrl: string
	status?: 'starting' | 'ready' | 'stopping' | 'stopped' | 'error'
	failedPath?: string
	error?: string
}

type WorkerStatusResponse = {
	previewUrl?: string
	status?: string
}

export type { SandboxFile, SandboxHandle }

/**
 * HMAC-SHA256 signing for request authentication. Returns a hex digest the
 * worker can verify with the same secret.
 *
 * Why include the timestamp in the signed payload: prevents replay of an
 * older request body with the same signature. The worker should reject
 * timestamps more than ~5 minutes old.
 */
async function hmacSign(secret: string, message: string): Promise<string> {
	const enc = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
	const view = new Uint8Array(sig)
	let hex = ''
	for (let i = 0; i < view.length; i++) {
		hex += view[i].toString(16).padStart(2, '0')
	}
	return hex
}

function formatErr(err: unknown): string {
	if (err instanceof Error) return err.message
	return String(err)
}

function generateRequestId(): string {
	return crypto.randomUUID().replace(/-/g, '')
}
