import type { Sandbox } from '@cloudflare/sandbox'
import { verifyHmac } from './hmac'
import { isSafeRelativePath, isValidProjectId, sanitizeFilePath } from './validate'

export interface SandboxWorkerEnv {
	Sandbox: DurableObjectNamespace<Sandbox>
	HMAC_SECRET: string
}

type SandboxProcess = {
	waitForPort?: (port: number) => Promise<void>
	kill?: () => Promise<void>
}

type SandboxLike = {
	getExposedPorts(hostname: string): Promise<Array<{ url: string; port: number; status: string }>>
	exposePort(port: number, options: { hostname: string }): Promise<{ url: string; port: number }>
	startProcess(
		command: string,
		options: { processId: string; cwd?: string; env?: Record<string, string> },
	): Promise<SandboxProcess>
	getProcess(id: string): Promise<SandboxProcess | null>
	writeFile(path: string, content: string): Promise<unknown>
	killProcess?(id: string, signal?: string): Promise<unknown>
	destroy?(): Promise<void>
}

type GetSandboxFn = (ns: DurableObjectNamespace<Sandbox>, id: string) => SandboxLike
type ProxyToSandboxFn = (request: Request, env: SandboxWorkerEnv) => Promise<Response | null>
type PassthroughFetchFn = (request: Request) => Promise<Response>

export interface SandboxWorkerDeps {
	getSandbox: GetSandboxFn
	proxyToSandbox?: ProxyToSandboxFn
	passthroughFetch?: PassthroughFetchFn
	now?: () => number
}

const NEXT_PORT = 3001
const PROCESS_ID = 'next-dev-server'
const HMAC_WINDOW_MS = 5 * 60 * 1000
const DEV_SERVER_TIMEOUT_MS = 8_000

const API_HOSTNAME = 'sandbox.meldar.ai'
const PREVIEW_BASE_HOSTNAME = 'meldar.ai'

export function createSandboxWorker(deps: SandboxWorkerDeps) {
	const now = deps.now ?? (() => Date.now())
	const passthrough = deps.passthroughFetch ?? globalThis.fetch.bind(globalThis)

	async function handleFetch(request: Request, env: SandboxWorkerEnv): Promise<Response> {
		try {
			if (deps.proxyToSandbox) {
				const proxied = await deps.proxyToSandbox(request, env)
				if (proxied) return proxied
			}

			const url = new URL(request.url)

			if (url.host !== API_HOSTNAME) {
				return passthrough(request)
			}

			if (url.pathname === '/healthz') {
				return jsonResponse({ status: 'ok' }, 200)
			}

			if (request.method !== 'POST') {
				return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
			}

			const route = ROUTES[url.pathname]
			if (!route) {
				return jsonResponse({ error: 'NOT_FOUND' }, 404)
			}

			const rawBody = await request.text()
			const timestamp = request.headers.get('x-meldar-timestamp') ?? ''
			const signature = request.headers.get('x-meldar-signature') ?? ''

			const hmacResult = await verifyHmac({
				secret: env.HMAC_SECRET ?? '',
				timestampHeader: timestamp,
				signatureHeader: signature,
				rawBody,
				now: now(),
				windowMs: HMAC_WINDOW_MS,
			})
			if (!hmacResult.ok) {
				return jsonResponse({ error: 'UNAUTHORIZED' }, 401)
			}

			let body: unknown
			try {
				body = rawBody.length === 0 ? {} : JSON.parse(rawBody)
			} catch {
				return jsonResponse({ error: 'BAD_REQUEST' }, 400)
			}

			const ctx: RouteContext = { hostname: PREVIEW_BASE_HOSTNAME, env, deps }
			return await route(body, ctx)
		} catch (err) {
			console.error('[sandbox-worker] unhandled error', err)
			return jsonResponse({ error: 'INTERNAL' }, 500)
		}
	}

	return { fetch: handleFetch }
}

interface RouteContext {
	hostname: string
	env: SandboxWorkerEnv
	deps: SandboxWorkerDeps
}

type RouteHandler = (body: unknown, ctx: RouteContext) => Promise<Response>

const ROUTES: Record<string, RouteHandler> = {
	'/api/v1/prewarm': handlePrewarm,
	'/api/v1/start': handleStart,
	'/api/v1/write': handleWrite,
	'/api/v1/status': handleStatus,
	'/api/v1/stop': handleStop,
}

async function handlePrewarm(body: unknown, ctx: RouteContext): Promise<Response> {
	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxNameFor(projectId))

	try {
		const port = await ensureDevServer(sandbox, ctx.hostname)
		return jsonResponse({ ok: true, previewUrl: port.url, status: 'ready' }, 200)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

async function handleStart(body: unknown, ctx: RouteContext): Promise<Response> {
	if (!isObject(body)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const files = parseFiles(body.files)
	if (files === null) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	for (const file of files) {
		if (!isSafeRelativePath(file.path)) {
			return jsonResponse({ error: 'BAD_REQUEST' }, 400)
		}
	}

	const sandboxName = sandboxNameFor(projectId)
	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxName)

	try {
		for (const file of files) {
			await sandbox.writeFile(`/app/${sanitizeFilePath(file.path)}`, file.content)
		}

		const port = await ensureDevServer(sandbox, ctx.hostname)

		return jsonResponse(
			{
				sandboxId: sandboxName,
				previewUrl: port.url,
				status: 'ready',
				revision: 0,
			},
			200,
		)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
		),
	])
}

async function ensureDevServer(
	sandbox: SandboxLike,
	hostname: string,
): Promise<{ url: string; port: number }> {
	const existingPorts = await sandbox.getExposedPorts(hostname)
	const existing = existingPorts.find((p) => p.port === NEXT_PORT)
	if (existing) {
		return existing
	}

	const port = await sandbox.exposePort(NEXT_PORT, { hostname })
	try {
		const proc = await withTimeout(
			sandbox.startProcess('npm run dev', {
				processId: PROCESS_ID,
				cwd: '/app',
				env: { PORT: String(NEXT_PORT), HOSTNAME: '0.0.0.0' },
			}),
			DEV_SERVER_TIMEOUT_MS,
			'startProcess',
		)
		if (proc?.waitForPort) {
			await withTimeout(proc.waitForPort(NEXT_PORT), DEV_SERVER_TIMEOUT_MS, 'waitForPort')
		}
	} catch {
		// startProcess hangs for long-running processes (Cloudflare SDK limitation).
		// The timeout fires but the dev server keeps running inside the container.
		// Return the preview URL — the proxy will wait for the port naturally.
	}
	return port
}

async function handleWrite(body: unknown, ctx: RouteContext): Promise<Response> {
	if (!isObject(body)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const files = parseFiles(body.files)
	if (files === null || files.length === 0) {
		return jsonResponse({ error: 'BAD_REQUEST' }, 400)
	}

	for (const file of files) {
		if (!isSafeRelativePath(file.path)) {
			return jsonResponse({ error: 'BAD_REQUEST' }, 400)
		}
	}

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxNameFor(projectId))

	try {
		const existingPorts = await sandbox.getExposedPorts(ctx.hostname)
		const existing = existingPorts.find((p) => p.port === NEXT_PORT)
		if (!existing) {
			return jsonResponse({ error: 'NOT_FOUND' }, 404)
		}

		for (const file of files) {
			try {
				await sandbox.writeFile(`/app/${sanitizeFilePath(file.path)}`, file.content)
			} catch (err) {
				return jsonResponse(
					{
						previewUrl: existing.url,
						failedPath: file.path,
						error: err instanceof Error ? err.message : String(err),
					},
					200,
				)
			}
		}

		return jsonResponse(
			{
				previewUrl: existing.url,
				status: 'ready',
				revision: 0,
			},
			200,
		)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

async function handleStatus(body: unknown, ctx: RouteContext): Promise<Response> {
	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxNameFor(projectId))

	try {
		const existingPorts = await sandbox.getExposedPorts(ctx.hostname)
		const existing = existingPorts.find((p) => p.port === NEXT_PORT)
		if (!existing) {
			return jsonResponse({ error: 'NOT_FOUND' }, 404)
		}
		return jsonResponse({ previewUrl: existing.url, status: 'ready' }, 200)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

async function handleStop(body: unknown, ctx: RouteContext): Promise<Response> {
	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxNameFor(projectId))

	try {
		const proc = await sandbox.getProcess(PROCESS_ID)
		if (!proc) {
			return jsonResponse({ error: 'NOT_FOUND' }, 404)
		}
		if (proc.kill) {
			await proc.kill()
		} else if (sandbox.killProcess) {
			await sandbox.killProcess(PROCESS_ID)
		}
		return jsonResponse({ ok: true }, 200)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

function sandboxNameFor(projectId: string): string {
	return `project-${projectId}`
}

function parseProjectId(body: unknown): string | null {
	if (!isObject(body)) return null
	const id = body.projectId
	if (typeof id !== 'string') return null
	if (!isValidProjectId(id)) return null
	return id
}

function parseFiles(value: unknown): Array<{ path: string; content: string }> | null {
	if (value === undefined) return []
	if (!Array.isArray(value)) return null
	const out: Array<{ path: string; content: string }> = []
	for (const entry of value) {
		if (!isObject(entry)) return null
		if (typeof entry.path !== 'string' || typeof entry.content !== 'string') return null
		out.push({ path: entry.path, content: entry.content })
	}
	return out
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}

function mapSandboxError(err: unknown, projectId: string): Response {
	const message = err instanceof Error ? err.message : String(err)
	const lower = message.toLowerCase()
	console.error(`[sandbox-worker] sandbox error for project=${projectId}: ${message}`)

	if (lower.includes('quota') || lower.includes('exhausted') || lower.includes('rate limit')) {
		return jsonResponse({ error: 'QUOTA_EXHAUSTED' }, 503)
	}
	if (lower.includes('conflict') || lower.includes('already')) {
		return jsonResponse({ error: 'CONFLICT' }, 409)
	}
	if (lower.includes('not found')) {
		return jsonResponse({ error: 'NOT_FOUND' }, 404)
	}
	return jsonResponse({ error: 'INTERNAL' }, 500)
}
