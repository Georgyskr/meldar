import type { Sandbox } from '@cloudflare/sandbox'
import { classifyDevServerFailure } from './classify'
import { WorkerError, type WorkerErrorCode } from './errors'
import { verifyHmac } from './hmac'
import {
	exceedsBatchLimits,
	isSafeRelativePath,
	isValidProjectId,
	sanitizeFilePath,
} from './validate'

export interface SandboxWorkerEnv {
	Sandbox: DurableObjectNamespace<Sandbox>
	HMAC_SECRET: string
	/** '1' bypasses the fail-closed HMAC_SECRET check for local `wrangler dev`. */
	MELDAR_DEV_MODE?: string
}

type SandboxExecResult = {
	exitCode: number
	stdout: string
	stderr: string
}

type SandboxLike = Pick<
	Sandbox,
	| 'getExposedPorts'
	| 'exposePort'
	| 'startProcess'
	| 'getProcess'
	| 'writeFile'
	| 'killProcess'
	| 'destroy'
	| 'setKeepAlive'
	| 'exec'
> & {
	touch?(): Promise<void>
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
// Cold start budget: container provisioning (~15-25s) + npm dev boot (~5-10s) = ~30-45s.
// Give a 90s ceiling to absorb tail latency on the first request after deploy.
const DEV_SERVER_READY_TIMEOUT_MS = 85_000

const REQUEST_ID_HEADER = 'x-meldar-request-id'
const REQUEST_ID_PATTERN = /^[0-9a-f]{32}$/
const USER_ID_HEADER = 'x-meldar-user-id'
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/
// When readiness='http', TCP bind must happen within this window; the remaining
// budget is spent waiting for the first 2xx/3xx from the dev server root.
const TCP_PHASE_SECONDS = 15
const HTTP_PHASE_SECONDS = 18

type Readiness = 'tcp' | 'http'

const API_HOSTNAMES = new Set([
	'sandbox.meldar.ai',
	'meldar-sandbox-worker.gosha-skryuchenkov.workers.dev',
])
const PREVIEW_BASE_HOSTNAME = 'meldar.ai'
// CF Sandbox SDK preview URL shape: `{port}-{sandboxId}[-{token}].{base}`.
// Matching this lets us detect preview-targeted requests that the SDK
// couldn't route (null return) so we don't silently passthrough and
// cause a CF edge loop back into this same worker.
const PREVIEW_HOST_PATTERN = /^\d+-[\w-]+\.meldar\.ai$/

export function createSandboxWorker(deps: SandboxWorkerDeps) {
	const now = deps.now ?? (() => Date.now())
	const passthrough = deps.passthroughFetch ?? globalThis.fetch.bind(globalThis)

	async function handleFetch(request: Request, env: SandboxWorkerEnv): Promise<Response> {
		const requestId = readOrGenerateRequestId(request)
		try {
			const preUrl = new URL(request.url)
			if (
				preUrl.pathname === '/_next/webpack-hmr' &&
				request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
			) {
				return jsonResponse({ error: 'HMR_NOT_AVAILABLE' }, 404, requestId)
			}

			if (deps.proxyToSandbox) {
				const proxied = await deps.proxyToSandbox(request, env)
				if (proxied) return stampRequestId(proxied, requestId)
			}

			const url = new URL(request.url)

			// Test against hostname (no port) so `host:port` variants still match
			// and we don't accidentally passthrough a preview-shaped URL.
			if (PREVIEW_HOST_PATTERN.test(url.hostname)) {
				console.warn(
					`[sandbox-worker] preview host ${url.hostname} not routable by proxyToSandbox ` +
						`(path=${url.pathname}, upgrade=${request.headers.get('Upgrade') ?? 'none'}); ` +
						'refusing passthrough to avoid edge loop.',
				)
				return jsonResponse({ error: 'PREVIEW_UNROUTABLE' }, 502, requestId)
			}

			if (
				!API_HOSTNAMES.has(url.host) &&
				!url.pathname.startsWith('/api/v1/') &&
				url.pathname !== '/healthz'
			) {
				return stampRequestId(await passthrough(request), requestId)
			}

			if (url.pathname === '/healthz') {
				return jsonResponse({ status: 'ok' }, 200, requestId)
			}

			if (request.method !== 'POST') {
				return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, requestId)
			}

			const route = ROUTES[url.pathname]
			if (!route) {
				return jsonResponse({ error: 'NOT_FOUND' }, 404, requestId)
			}

			// Fail-closed on unset HMAC_SECRET so ops can distinguish
			// misconfiguration from signature-mismatch. Dev-mode bypass keeps
			// `wrangler dev` booting; never set MELDAR_DEV_MODE=1 in prod.
			if (!env.HMAC_SECRET && env.MELDAR_DEV_MODE !== '1') {
				console.error(
					'[sandbox-worker] HMAC_SECRET is not configured. ' +
						"Set it via 'wrangler secret put HMAC_SECRET' or set " +
						'MELDAR_DEV_MODE=1 for local development.',
				)
				return jsonResponse({ error: 'CONFIG_ERROR' }, 503, requestId)
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
				return jsonResponse({ error: 'UNAUTHORIZED' }, 401, requestId)
			}

			let body: unknown
			try {
				body = rawBody.length === 0 ? {} : JSON.parse(rawBody)
			} catch {
				return jsonResponse({ error: 'BAD_REQUEST' }, 400, requestId)
			}

			const rawUserId = request.headers.get(USER_ID_HEADER) ?? ''
			const userId = USER_ID_PATTERN.test(rawUserId) ? rawUserId : undefined
			const ctx: RouteContext = {
				hostname: PREVIEW_BASE_HOSTNAME,
				env,
				deps,
				requestId,
				userId,
			}
			return stampRequestId(await route(body, ctx), requestId)
		} catch (err) {
			console.error('[sandbox-worker] unhandled error', err)
			return jsonResponse({ error: 'INTERNAL' }, 500, requestId)
		}
	}

	return { fetch: handleFetch }
}

interface RouteContext {
	hostname: string
	env: SandboxWorkerEnv
	deps: SandboxWorkerDeps
	requestId: string
	userId?: string
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

	const sandboxName = await sandboxNameFor(projectId)
	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxName)

	return withSandboxActivity(sandbox, async () => {
		try {
			const port = await ensureDevServer(sandbox, ctx.hostname, 'http', {
				requestId: ctx.requestId,
				projectId,
				sandboxName,
				userId: ctx.userId,
			})
			return jsonResponse({ ok: true, previewUrl: port.url, status: 'ready' }, 200)
		} catch (err) {
			return mapSandboxError(err, projectId)
		}
	})
}

async function handleStart(body: unknown, ctx: RouteContext): Promise<Response> {
	if (!isObject(body)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const files = parseFiles(body.files)
	if (files === null) return jsonResponse({ error: 'BAD_REQUEST' }, 400)
	if (exceedsBatchLimits(files)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	for (const file of files) {
		if (!isSafeRelativePath(file.path)) {
			return jsonResponse({ error: 'BAD_REQUEST' }, 400)
		}
	}

	const sandboxName = await sandboxNameFor(projectId)
	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxName)

	return withSandboxActivity(sandbox, async () => {
		try {
			for (const file of files) {
				await sandbox.writeFile(`/app/${sanitizeFilePath(file.path)}`, file.content)
			}

			const port = await ensureDevServer(sandbox, ctx.hostname, 'http', {
				requestId: ctx.requestId,
				projectId,
				sandboxName,
				userId: ctx.userId,
			})

			return jsonResponse(
				{
					sandboxId: sandboxName,
					previewUrl: port.url,
					status: 'ready',
				},
				200,
			)
		} catch (err) {
			return mapSandboxError(err, projectId)
		}
	})
}

type EnsureMeta = {
	requestId: string
	projectId: string
	sandboxName: string
	userId?: string
}

async function ensureDevServer(
	sandbox: SandboxLike,
	hostname: string,
	readiness: Readiness,
	meta?: EnsureMeta,
): Promise<{ url: string; port: number }> {
	const t0 = Date.now()
	const existingPorts = await sandbox.getExposedPorts(hostname)
	const existingPort = existingPorts.find((p) => p.port === NEXT_PORT)
	const path: 'warm' | 'cold' = existingPort ? 'warm' : 'cold'
	const port = existingPort ?? (await sandbox.exposePort(NEXT_PORT, { hostname }))
	const exposePortMs = Date.now() - t0
	const effectiveReadiness: 'tcp' | 'http' = readiness

	// Pin container alive on first access. Without this, the container is
	// killed by inactivity (~10m default), and the next request pays a
	// 15-25s cold-restart penalty during which writeFile RPCs hang.
	if (sandbox.setKeepAlive) {
		await sandbox.setKeepAlive(true).catch(logKeepAliveFailure('enable'))
	}

	if (!sandbox.exec) {
		// No exec — fall back to startProcess (less reliable; kept for tests).
		const existingProc = await sandbox.getProcess(PROCESS_ID).catch(() => null)
		const isAlive =
			existingProc &&
			(existingProc.status === 'starting' ||
				existingProc.status === 'running' ||
				!existingProc.status)
		if (!isAlive) {
			const proc = await sandbox.startProcess('npm run dev', {
				processId: PROCESS_ID,
				cwd: '/app',
				env: { PORT: String(NEXT_PORT), HOSTNAME: '0.0.0.0' },
			})
			if (proc.waitForPort) {
				await proc.waitForPort(NEXT_PORT, {
					mode: effectiveReadiness,
					...(effectiveReadiness === 'http' ? { path: '/', status: { min: 200, max: 399 } } : {}),
				})
			}
		}
		return port
	}

	// Start the dev server (if not already running) and wait for readiness in a
	// SINGLE exec. We can't split into multiple exec calls because the SDK
	// reuses one shell session per sandbox; once the shell terminates the
	// session is dead and subsequent execs fail with "Shell terminated".
	//
	// Why not startProcess: its RPCs get canceled when the worker function
	// returns, killing the child. `setsid nohup ... &` fully detaches.
	//
	// Readiness modes:
	// - 'tcp': Next.js binds the port in ~2s. Fast path for /write — HMR
	//   handles any in-flight compile transparently once the port is up.
	// - 'http': after TCP bind, poll GET / until 2xx/3xx. /start and /prewarm
	//   must wait for this so the iframe isn't advertised before it can
	//   render; first-page compile is 20-40s and a bare TCP-ready signal
	//   would hang the iframe.
	const tcpProbe = `bash -c '(echo > /dev/tcp/localhost/${NEXT_PORT}) 2>/dev/null'`
	const tcpLoop =
		`for i in $(seq 1 ${TCP_PHASE_SECONDS}); do ${tcpProbe} && break; sleep 1; done; ` +
		`${tcpProbe} || { echo "dev-server.log (tcp probe timed out):" >&2; ` +
		`tail -30 /tmp/dev-server.log >&2 || true; exit 1; }`
	const httpLoop =
		`code=000; ` +
		`for i in $(seq 1 ${HTTP_PHASE_SECONDS}); do ` +
		`code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:${NEXT_PORT}/ || echo 000); ` +
		`case "$code" in 2??|3??) exit 0 ;; esac; ` +
		`sleep 1; ` +
		`done; ` +
		`echo "dev-server.log (http probe timed out, last code=$code):" >&2; ` +
		`tail -30 /tmp/dev-server.log >&2 || true; exit 1`

	// Wrap in a subshell `( ... )` so `exit` only kills the subshell, not the
	// SDK's persistent shell session (which would mark the session dead).
	// Note: `&` ends a statement, so no `;` after backgrounding.
	const launch =
		`${tcpProbe} || { cd /app && setsid nohup npm run dev > /tmp/dev-server.log 2>&1 < /dev/null & }; ` +
		`${tcpLoop}`
	const cmd = effectiveReadiness === 'http' ? `(${launch}; ${httpLoop})` : `(${launch}; exit 0)`

	const tProbe = Date.now()
	const probe = sandbox.exec(cmd, { timeout: DEV_SERVER_READY_TIMEOUT_MS + 5_000 })
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(
			() =>
				reject(
					new WorkerError(
						'DEV_SERVER_TIMEOUT',
						`dev server not ready after ${DEV_SERVER_READY_TIMEOUT_MS}ms (readiness=${readiness})`,
					),
				),
			DEV_SERVER_READY_TIMEOUT_MS,
		),
	)
	let result: SandboxExecResult
	try {
		result = await Promise.race([probe, timeout])
	} catch (err) {
		const probeMs = Date.now() - tProbe
		const code = err instanceof WorkerError ? err.code : ('DEV_SERVER_PROBE_FAILED' as const)
		const message = err instanceof Error ? err.message : String(err)
		// DEV_SERVER_TIMEOUT → exit 124 so classifyDevServerFailure maps it
		// to READINESS_TIMEOUT; -1 is the sentinel for any other rejection.
		const exitCode = code === 'DEV_SERVER_TIMEOUT' ? 124 : -1
		const stderrTail = code === 'DEV_SERVER_TIMEOUT' ? '' : message.slice(0, 1200)
		logDevServerReady(meta, {
			path,
			readiness: effectiveReadiness,
			exposePortMs,
			probeMs,
			exitCode,
			errorCode: code,
			stderrTail,
		})
		throw new WorkerError(code, message, { cause: err, loggedAtSource: true })
	}
	const probeMs = Date.now() - tProbe
	if (result.exitCode !== 0) {
		logDevServerReady(meta, {
			path,
			readiness: effectiveReadiness,
			exposePortMs,
			probeMs,
			exitCode: result.exitCode,
			errorCode: 'DEV_SERVER_PROBE_FAILED',
			stderrTail: result.stderr.slice(0, 1200),
		})
		throw new WorkerError(
			'DEV_SERVER_PROBE_FAILED',
			`dev server probe failed (exit=${result.exitCode}, readiness=${effectiveReadiness}): ${result.stderr.slice(0, 1200)}`,
			{ loggedAtSource: true },
		)
	}

	logDevServerReady(meta, {
		path,
		readiness: effectiveReadiness,
		exposePortMs,
		probeMs,
		exitCode: 0,
	})
	return port
}

const SECRET_PATTERNS: ReadonlyArray<{ re: RegExp; replacement: string }> = [
	{ re: /\b(Bearer|Basic)\s+[A-Za-z0-9+/=_-]{8,}/gi, replacement: '$1 [REDACTED]' },
	{
		re: /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PWD|API))\s*[:=]\s*["']?[^\s"'&]+/g,
		replacement: '$1=[REDACTED]',
	},
	{ re: /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}/g, replacement: '[REDACTED_KEY]' },
	{ re: /\b(re|gh[ops])_[A-Za-z0-9]{16,}/g, replacement: '[REDACTED_KEY]' },
	{ re: /\bsk-ant-[A-Za-z0-9_-]{16,}/g, replacement: '[REDACTED_KEY]' },
	{
		re: /\b(postgres|mysql|mongodb)(?:\+srv)?:\/\/[^\s/]+:[^\s@/]+@/gi,
		replacement: '$1://[REDACTED]@',
	},
]

function scrubSecrets(s: string): string {
	let out = s
	for (const { re, replacement } of SECRET_PATTERNS) {
		out = out.replace(re, replacement)
	}
	return out
}

/** One structured JSON log per ensureDevServer call, emitted to stdout
 *  (ingested by Workers Logs). No-op when `meta` is undefined so bare test
 *  fakes don't spam. */
function logDevServerReady(
	meta: EnsureMeta | undefined,
	fields: {
		path: 'warm' | 'cold'
		readiness: Readiness
		exposePortMs: number
		probeMs: number
		exitCode: number
		errorCode?: string
		stderrTail?: string
	},
): void {
	if (!meta) return
	const errorSubtype = fields.errorCode
		? classifyDevServerFailure(fields.stderrTail ?? '', fields.exitCode)
		: undefined
	const scrubbedStderr = fields.stderrTail ? scrubSecrets(fields.stderrTail) : undefined

	const entry = {
		event: 'sandbox.dev_server_ready',
		timestamp: new Date().toISOString(),
		requestId: meta.requestId,
		projectId: meta.projectId,
		...(meta.userId ? { userId: meta.userId } : {}),
		sandboxName: meta.sandboxName,
		path: fields.path,
		readiness: fields.readiness,
		exposePortMs: fields.exposePortMs,
		probeMs: fields.probeMs,
		totalMs: fields.exposePortMs + fields.probeMs,
		exitCode: fields.exitCode,
		...(fields.errorCode ? { errorCode: fields.errorCode } : {}),
		...(errorSubtype ? { errorSubtype } : {}),
		...(scrubbedStderr ? { stderrTail: scrubbedStderr } : {}),
	}
	console.log(JSON.stringify(entry))
}

async function handleWrite(body: unknown, ctx: RouteContext): Promise<Response> {
	if (!isObject(body)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const files = parseFiles(body.files)
	if (files === null || files.length === 0) {
		return jsonResponse({ error: 'BAD_REQUEST' }, 400)
	}
	if (exceedsBatchLimits(files)) return jsonResponse({ error: 'BAD_REQUEST' }, 400)

	for (const file of files) {
		if (!isSafeRelativePath(file.path)) {
			return jsonResponse({ error: 'BAD_REQUEST' }, 400)
		}
	}

	const sandboxName = await sandboxNameFor(projectId)
	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, sandboxName)

	return withSandboxActivity(sandbox, async () => {
		try {
			// Write before ensureDevServer so HMR doesn't see a half-applied batch.
			// previewUrlPre gives partial-failure responses a URL without booting.
			const existingPorts = await sandbox.getExposedPorts(ctx.hostname)
			const existingPort = existingPorts.find((p) => p.port === NEXT_PORT)
			const previewUrlPre = existingPort?.url ?? ''

			for (const file of files) {
				try {
					await sandbox.writeFile(`/app/${sanitizeFilePath(file.path)}`, file.content)
				} catch (err) {
					console.error(
						`[sandbox-worker] WRITE_FAILED for project=${projectId} path=${file.path}: ${
							err instanceof Error ? err.message : String(err)
						}`,
					)
					return jsonResponse(
						{
							previewUrl: previewUrlPre,
							failedPath: file.path,
							error: 'WRITE_FAILED',
						},
						200,
					)
				}
			}

			const port = await ensureDevServer(sandbox, ctx.hostname, 'http', {
				requestId: ctx.requestId,
				projectId,
				sandboxName,
				userId: ctx.userId,
			})

			return jsonResponse(
				{
					previewUrl: port.url,
					status: 'ready',
				},
				200,
			)
		} catch (err) {
			return mapSandboxError(err, projectId)
		}
	})
}

async function handleStatus(body: unknown, ctx: RouteContext): Promise<Response> {
	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, await sandboxNameFor(projectId))

	return withSandboxActivity(sandbox, async () => {
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
	})
}

async function handleStop(body: unknown, ctx: RouteContext): Promise<Response> {
	const projectId = parseProjectId(body)
	if (!projectId) return jsonResponse({ error: 'INVALID_PROJECT_ID' }, 400)

	const sandbox = ctx.deps.getSandbox(ctx.env.Sandbox, await sandboxNameFor(projectId))

	try {
		if (sandbox.exec) {
			// Exec-launched dev server (`setsid nohup … &`) has no SDK PID.
			// Kill by port+name; trailing `true` keeps the shell exit 0 so
			// stop is idempotent when nothing is running.
			await sandbox.exec(
				`bash -c 'pkill -f "next-server" 2>/dev/null; ` +
					`pkill -f "npm run dev" 2>/dev/null; true'`,
			)
			if (sandbox.setKeepAlive) {
				await sandbox.setKeepAlive(false).catch(logKeepAliveFailure('disable'))
			}
			return jsonResponse({ ok: true }, 200)
		}

		const proc = await sandbox.getProcess(PROCESS_ID)
		if (!proc) {
			return jsonResponse({ error: 'NOT_FOUND' }, 404)
		}
		if (proc.kill) {
			await proc.kill()
		} else if (sandbox.killProcess) {
			await sandbox.killProcess(PROCESS_ID)
		}
		if (sandbox.setKeepAlive) {
			await sandbox.setKeepAlive(false).catch(logKeepAliveFailure('disable'))
		}
		return jsonResponse({ ok: true }, 200)
	} catch (err) {
		return mapSandboxError(err, projectId)
	}
}

// Cloudflare Sandbox preview URLs are {port}-{sandboxId}-{token}.{host}.
// DNS labels max 63 chars. Token (~16) + port prefix (5) + dashes leaves
// ~41 chars for sandboxId. The previous `p-${id.replace(/-/g,'')}` shape
// collapsed "abc-123" and "abc123" onto the same DO — a cross-tenant
// collision waiting to happen the moment projectIds become user-
// influenced. SHA-256 hex truncated to 39 chars (156 bits) is
// deterministic and collision-resistant; "p-" prefix totals 41.
export async function sandboxNameFor(projectId: string): Promise<string> {
	const bytes = new TextEncoder().encode(projectId)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	const view = new Uint8Array(digest)
	let hex = ''
	for (let i = 0; i < 20; i++) {
		hex += view[i].toString(16).padStart(2, '0')
	}
	return `p-${hex.slice(0, 39)}`
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

function jsonResponse(body: unknown, status: number, requestId?: string): Response {
	const headers: Record<string, string> = { 'content-type': 'application/json' }
	if (requestId) headers[REQUEST_ID_HEADER] = requestId
	return new Response(JSON.stringify(body), { status, headers })
}

function readOrGenerateRequestId(request: Request): string {
	const incoming = request.headers.get(REQUEST_ID_HEADER)
	if (incoming && REQUEST_ID_PATTERN.test(incoming)) return incoming
	return crypto.randomUUID().replace(/-/g, '')
}

function stampRequestId(response: Response, requestId: string): Response {
	if (response.headers.get(REQUEST_ID_HEADER) === requestId) return response
	const headers = new Headers(response.headers)
	headers.set(REQUEST_ID_HEADER, requestId)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

const STATUS_BY_CODE: Record<WorkerErrorCode, number> = {
	DEV_SERVER_PROBE_FAILED: 500,
	DEV_SERVER_TIMEOUT: 504,
	CONFLICT: 409,
	NOT_FOUND: 404,
	QUOTA_EXHAUSTED: 503,
	WRITE_FAILED: 500,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	INVALID_PROJECT_ID: 400,
	METHOD_NOT_ALLOWED: 405,
	CONFIG_ERROR: 503,
	INTERNAL: 500,
}

function logKeepAliveFailure(action: 'enable' | 'disable'): (err: unknown) => void {
	return (err) => {
		console.warn(
			`[sandbox-worker] setKeepAlive(${action}) failed: ${
				err instanceof Error ? err.message : String(err)
			}`,
		)
	}
}

/** Marks the sandbox active on any 2xx response. Handlers use this instead
 *  of calling markActive inline so a forgotten call can't silently stop the
 *  reaper from seeing activity. */
async function withSandboxActivity(
	sandbox: SandboxLike,
	fn: () => Promise<Response>,
): Promise<Response> {
	const res = await fn()
	if (res.status >= 200 && res.status < 300) {
		await markActive(sandbox)
	}
	return res
}

let touchMissingWarned = false

async function markActive(sandbox: SandboxLike): Promise<void> {
	if (!sandbox.touch) {
		// If touch goes missing in prod, reap scheduling is silently disabled —
		// warn once so the regression is visible in Workers Logs.
		if (!touchMissingWarned) {
			touchMissingWarned = true
			console.warn(
				'[sandbox-worker] sandbox.touch() is absent on the sandbox surface. ' +
					'MeldarSandbox should expose it; if this warn fires in prod, the cost-DoS ' +
					'reaper is silently disabled. Check SDK version vs MeldarSandbox subclass.',
			)
		}
		return
	}
	try {
		await sandbox.touch()
	} catch (err) {
		console.warn(
			`[sandbox-worker] sandbox.touch() failed: ${err instanceof Error ? err.message : String(err)}`,
		)
	}
}

function mapSandboxError(err: unknown, projectId: string): Response {
	const errName = err instanceof Error ? err.name : 'Error'
	const message = err instanceof Error ? err.message : String(err)
	const stack = err instanceof Error ? err.stack : undefined
	const code: WorkerErrorCode = err instanceof WorkerError ? err.code : 'INTERNAL'

	// Skip the free-text log when the throw site already emitted structured
	// JSON — otherwise every ensureDevServer failure produces two lines.
	const alreadyLogged = err instanceof WorkerError && err.loggedAtSource
	if (!alreadyLogged) {
		console.error(
			`[sandbox-worker] ${code} for project=${projectId}: ${errName}: ${message}`,
			stack ? `\n${stack.split('\n').slice(0, 5).join('\n')}` : '',
		)
	}

	return jsonResponse({ error: code }, STATUS_BY_CODE[code])
}
