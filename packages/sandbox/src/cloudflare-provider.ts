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
		this.timeoutMs = config.timeoutMs ?? 30_000
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

	async prewarm(projectId: string): Promise<void> {
		// Fire-and-forget semantics: log on failure, never throw. Callers
		// (Stripe webhook, magic-link click) rely on this.
		try {
			await this.callWorker('POST', '/api/v1/prewarm', { projectId })
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
			response = await this.callWorker<WorkerStartResponse>('POST', '/api/v1/start', {
				projectId: options.projectId,
				userId: options.userId,
				template: options.template,
				files: options.initialFiles ?? [],
			})
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
			revision: response.revision ?? 0,
		}
	}

	async writeFiles(options: WriteFilesOptions): Promise<SandboxHandle> {
		for (const file of options.files) {
			assertSafeSandboxPath(file.path, { projectId: options.projectId })
		}

		let response: WorkerWriteResponse
		try {
			response = await this.callWorker<WorkerWriteResponse>('POST', '/api/v1/write', {
				projectId: options.projectId,
				files: options.files,
			})
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
			revision: response.revision ?? 0,
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
	): Promise<T> {
		const url = `${this.workerUrl}${path}`
		const bodyJson = JSON.stringify(body)
		const timestamp = Date.now().toString()
		const signature = await hmacSign(this.hmacSecret, `${timestamp}.${bodyJson}`)

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

		let res: Response
		try {
			res = await this.fetchImpl(url, {
				method,
				headers: {
					'content-type': 'application/json',
					'x-meldar-timestamp': timestamp,
					'x-meldar-signature': signature,
				},
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

		if (res.status === 404) {
			throw new SandboxNotFoundError(`worker returned 404 for ${path}`)
		}
		if (!res.ok) {
			const errBody = await res.text().catch(() => '<no body>')
			// 409 Conflict → sandbox is in an unstartable state. The orchestrator
			// can retry-with-stop in this case. Map to NotReady so the caller
			// gets the right error class.
			if (res.status === 409) {
				throw new SandboxNotReadyError(`worker returned 409 Conflict: ${errBody.slice(0, 500)}`)
			}
			throw new SandboxStartFailedError(
				`worker returned ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`,
			)
		}

		const json = await res.json()
		return json as T
	}
}

type WorkerStartResponse = {
	sandboxId?: string
	previewUrl?: string
	status?: 'starting' | 'ready' | 'stopping' | 'stopped' | 'error'
	revision?: number
}

type WorkerWriteResponse = {
	previewUrl: string
	status?: 'starting' | 'ready' | 'stopping' | 'stopped' | 'error'
	revision?: number
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
