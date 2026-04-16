import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkerError } from '../errors'
import { createSandboxWorker, type SandboxWorkerEnv, sandboxNameFor } from '../handler'
import { hmacSha256Hex } from '../hmac'

const HMAC_SECRET = 'test-secret-deadbeef'
const FIXED_NOW = 1_700_000_000_000
let FIRST_NAME = ''
let ALPHA_NAME = ''
let BETA_NAME = ''

type FakeProcess = {
	waitForPort: ReturnType<typeof vi.fn>
	kill: ReturnType<typeof vi.fn>
}

type FakeSandbox = {
	getExposedPorts: ReturnType<typeof vi.fn>
	exposePort: ReturnType<typeof vi.fn>
	startProcess: ReturnType<typeof vi.fn>
	getProcess: ReturnType<typeof vi.fn>
	writeFile: ReturnType<typeof vi.fn>
	killProcess: ReturnType<typeof vi.fn>
	exec?: ReturnType<typeof vi.fn>
	setKeepAlive?: ReturnType<typeof vi.fn>
	touch?: ReturnType<typeof vi.fn>
}

function makeFakeSandbox(overrides: Partial<FakeSandbox> = {}): FakeSandbox {
	const proc: FakeProcess = {
		waitForPort: vi.fn().mockResolvedValue(undefined),
		kill: vi.fn().mockResolvedValue(undefined),
	}
	return {
		getExposedPorts: vi.fn().mockResolvedValue([]),
		exposePort: vi
			.fn()
			.mockResolvedValue({ url: 'https://3001-project.workers.dev', port: 3001, name: undefined }),
		startProcess: vi.fn().mockResolvedValue(proc),
		getProcess: vi.fn().mockResolvedValue(proc),
		writeFile: vi.fn().mockResolvedValue(undefined),
		killProcess: vi.fn().mockResolvedValue(undefined),
		touch: vi.fn().mockResolvedValue(undefined),
		...overrides,
	}
}

function makeFakeExecSandbox(overrides: Partial<FakeSandbox> = {}): FakeSandbox {
	return makeFakeSandbox({
		exec: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
		setKeepAlive: vi.fn().mockResolvedValue(undefined),
		...overrides,
	})
}

function makeEnv(): SandboxWorkerEnv {
	return {
		Sandbox: { idFromName: vi.fn() } as unknown as SandboxWorkerEnv['Sandbox'],
		HMAC_SECRET,
	}
}

async function signedRequest(
	path: string,
	body: unknown,
	options: { secret?: string; timestamp?: number; tamperBody?: string } = {},
): Promise<Request> {
	const secret = options.secret ?? HMAC_SECRET
	const timestamp = (options.timestamp ?? FIXED_NOW).toString()
	const rawBody = JSON.stringify(body)
	const signed = options.tamperBody ?? rawBody
	const signature = await hmacSha256Hex(secret, `${timestamp}.${signed}`)
	return new Request(`https://sandbox.meldar.ai${path}`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-meldar-timestamp': timestamp,
			'x-meldar-signature': signature,
		},
		body: rawBody,
	})
}

describe('sandbox worker', () => {
	let getSandboxFn: ReturnType<typeof vi.fn>
	let fakeSandbox: FakeSandbox
	let env: SandboxWorkerEnv
	let worker: ReturnType<typeof createSandboxWorker>
	let sandboxRegistry: Map<string, FakeSandbox>

	beforeAll(async () => {
		FIRST_NAME = await sandboxNameFor('proj_first')
		ALPHA_NAME = await sandboxNameFor('proj_alpha')
		BETA_NAME = await sandboxNameFor('proj_beta')
	})

	beforeEach(() => {
		sandboxRegistry = new Map()
		fakeSandbox = makeFakeSandbox()
		getSandboxFn = vi.fn((_ns: unknown, id: string) => {
			let s = sandboxRegistry.get(id)
			if (!s) {
				s = id === FIRST_NAME ? fakeSandbox : makeFakeSandbox()
				sandboxRegistry.set(id, s)
			}
			return s
		})
		// Canonical projectId across happy-path tests routes to the default
		// fakeSandbox so per-test mock overrides are observable.
		sandboxRegistry.set(FIRST_NAME, fakeSandbox)
		env = makeEnv()
		worker = createSandboxWorker({
			getSandbox: getSandboxFn as never,
			now: () => FIXED_NOW,
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('healthz', () => {
		it('GET /healthz returns 200 with no auth required', async () => {
			const req = new Request('https://sandbox.meldar.ai/healthz', { method: 'GET' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ status: 'ok' })
		})

		it('healthz works without HMAC headers', async () => {
			const req = new Request('https://sandbox.meldar.ai/healthz')
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
		})
	})

	describe('passthrough for non-API hostnames', () => {
		it('forwards www.meldar.ai requests to origin via passthroughFetch', async () => {
			const passthroughFetch = vi
				.fn()
				.mockResolvedValue(new Response('landing page', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://www.meldar.ai/about', { method: 'GET' })
			const res = await w.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('landing page')
			expect(passthroughFetch).toHaveBeenCalledOnce()
			expect(passthroughFetch).toHaveBeenCalledWith(req)
		})

		it('forwards meldar.ai apex requests to origin via passthroughFetch', async () => {
			const passthroughFetch = vi.fn().mockResolvedValue(new Response('apex', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://meldar.ai/', { method: 'GET' })
			const res = await w.fetch(req, env)
			expect(res.status).toBe(200)
			expect(passthroughFetch).toHaveBeenCalledOnce()
		})

		it('does NOT passthrough sandbox.meldar.ai (it is the API host)', async () => {
			const passthroughFetch = vi
				.fn()
				.mockResolvedValue(new Response('should not reach', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://sandbox.meldar.ai/healthz', { method: 'GET' })
			const res = await w.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ status: 'ok' })
			expect(passthroughFetch).not.toHaveBeenCalled()
		})

		it('proxyToSandbox preview URL path takes priority over passthrough', async () => {
			const proxyToSandbox = vi
				.fn()
				.mockResolvedValue(new Response('sandbox preview', { status: 200 }))
			const passthroughFetch = vi.fn()
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				proxyToSandbox,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://3001-abc-def.meldar.ai/', { method: 'GET' })
			const res = await w.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('sandbox preview')
			expect(proxyToSandbox).toHaveBeenCalledOnce()
			expect(passthroughFetch).not.toHaveBeenCalled()
		})

		it('does NOT passthrough a WebSocket upgrade on a preview hostname when proxy returns null', async () => {
			const proxyToSandbox = vi.fn().mockResolvedValue(null)
			const passthroughFetch = vi
				.fn()
				.mockResolvedValue(new Response('should never be called', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				proxyToSandbox,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://3001-p-deadbeef-tokenABC.meldar.ai/api/custom-ws', {
				method: 'GET',
				headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
			})
			const res = await w.fetch(req, env)
			expect(res.status).toBe(502)
			expect(passthroughFetch).not.toHaveBeenCalled()
		})

		it('does NOT passthrough a non-WS request on a preview-shaped hostname when proxy returns null', async () => {
			const proxyToSandbox = vi.fn().mockResolvedValue(null)
			const passthroughFetch = vi
				.fn()
				.mockResolvedValue(new Response('should never be called', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				proxyToSandbox,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://3001-p-deadbeef-tokenABC.meldar.ai/some-path', {
				method: 'GET',
			})
			const res = await w.fetch(req, env)
			expect(res.status).toBe(502)
			expect(passthroughFetch).not.toHaveBeenCalled()
		})

		it('short-circuits /_next/webpack-hmr WS upgrade with 404 without touching proxy', async () => {
			const proxyToSandbox = vi
				.fn()
				.mockResolvedValue(new Response('should never be called', { status: 200 }))
			const passthroughFetch = vi.fn()
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				proxyToSandbox,
				passthroughFetch,
				now: () => FIXED_NOW,
			})
			const req = new Request(
				'https://3001-p-deadbeef-tokenABC.meldar.ai/_next/webpack-hmr?id=abc',
				{
					method: 'GET',
					headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
				},
			)
			const res = await w.fetch(req, env)
			expect(res.status).toBe(404)
			expect(proxyToSandbox).not.toHaveBeenCalled()
			expect(passthroughFetch).not.toHaveBeenCalled()
		})

		it('does NOT short-circuit /_next/webpack-hmr for non-WS GET (lets proxy handle it)', async () => {
			const proxyToSandbox = vi.fn().mockResolvedValue(new Response('proxied', { status: 200 }))
			const w = createSandboxWorker({
				getSandbox: getSandboxFn as never,
				proxyToSandbox,
				now: () => FIXED_NOW,
			})
			const req = new Request('https://3001-p-deadbeef-tokenABC.meldar.ai/_next/webpack-hmr', {
				method: 'GET',
			})
			const res = await w.fetch(req, env)
			expect(res.status).toBe(200)
			expect(proxyToSandbox).toHaveBeenCalledOnce()
		})
	})

	describe('HMAC verification', () => {
		it('happy path: valid signature + timestamp returns 200', async () => {
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-x.workers.dev', port: 3001, status: 'active' },
			])
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
		})

		it('missing timestamp header returns 401', async () => {
			const body = JSON.stringify({ projectId: 'proj_first' })
			const sig = await hmacSha256Hex(HMAC_SECRET, `${FIXED_NOW}.${body}`)
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-meldar-signature': sig },
				body,
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
			expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' })
		})

		it('missing signature header returns 401', async () => {
			const body = JSON.stringify({ projectId: 'proj_first' })
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-meldar-timestamp': FIXED_NOW.toString(),
				},
				body,
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('wrong secret returns 401', async () => {
			const req = await signedRequest(
				'/api/v1/status',
				{ projectId: 'proj_first' },
				{ secret: 'wrong-secret' },
			)
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('stale timestamp (6 minutes old) returns 401', async () => {
			const stale = FIXED_NOW - 6 * 60 * 1000
			const req = await signedRequest(
				'/api/v1/status',
				{ projectId: 'proj_first' },
				{ timestamp: stale },
			)
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('timestamp from the future (6 minutes ahead) returns 401', async () => {
			const future = FIXED_NOW + 6 * 60 * 1000
			const req = await signedRequest(
				'/api/v1/status',
				{ projectId: 'proj_first' },
				{ timestamp: future },
			)
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('signature tampered (body modified after signing) returns 401', async () => {
			const req = await signedRequest(
				'/api/v1/status',
				{ projectId: 'proj_first' },
				{ tamperBody: JSON.stringify({ projectId: 'proj_other' }) },
			)
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('non-numeric timestamp returns 401', async () => {
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-meldar-timestamp': 'not-a-number',
					'x-meldar-signature': 'aabb',
				},
				body: JSON.stringify({ projectId: 'proj_first' }),
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})

		it('timestamp with trailing garbage returns 401', async () => {
			const body = JSON.stringify({ projectId: 'proj_first' })
			const sig = await hmacSha256Hex(HMAC_SECRET, `${FIXED_NOW}garbage.${body}`)
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-meldar-timestamp': `${FIXED_NOW}garbage`,
					'x-meldar-signature': sig,
				},
				body,
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
		})
	})

	describe('per-project isolation', () => {
		it('two different projectIds resolve to two different DO names', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValue([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req1 = await signedRequest('/api/v1/status', { projectId: 'proj_alpha' })
			const req2 = await signedRequest('/api/v1/status', { projectId: 'proj_beta' })
			await worker.fetch(req1, env)
			await worker.fetch(req2, env)
			const ids = (getSandboxFn.mock.calls as [unknown, string][]).map((c) => c[1])
			expect(ids).toContain(ALPHA_NAME)
			expect(ids).toContain(BETA_NAME)
			expect(new Set(ids).size).toBeGreaterThanOrEqual(2)
		})

		it('same projectId reuses the same DO name', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValue([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req1 = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const req2 = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			await worker.fetch(req1, env)
			await worker.fetch(req2, env)
			const names = (getSandboxFn.mock.calls as [unknown, string][]).map((c) => c[1])
			expect(names.every((n) => n === FIRST_NAME)).toBe(true)
		})
	})

	describe('sandboxNameFor (P1-6: collision + determinism)', () => {
		it('distinct projectIds that collided under dash-strip now map to distinct DOs', async () => {
			// Under old behavior `p-${id.replace(/-/g,'')}` collapsed both to
			// `p-abc123` — a cross-tenant collision. SHA-256 keeps them apart.
			const a = await sandboxNameFor('abc-123')
			const b = await sandboxNameFor('abc123')
			expect(a).not.toBe(b)
		})

		it('is deterministic: same projectId produces the same DO name', async () => {
			const a1 = await sandboxNameFor('proj_stable')
			const a2 = await sandboxNameFor('proj_stable')
			expect(a1).toBe(a2)
		})

		it('fits DNS label budget (≤41 chars) for preview URL host', async () => {
			// Cloudflare preview host is {port}-{sandboxId}-{token}.{host}. A 63-char
			// DNS label minus the token (~16) and port prefix (5) leaves ~41 chars.
			const maxProjectId = 'A'.repeat(64)
			const name = await sandboxNameFor(maxProjectId)
			expect(name.length).toBeLessThanOrEqual(41)
			expect(name).toMatch(/^p-[0-9a-f]+$/)
		})

		it('is case-sensitive: differently-cased projectIds map to distinct DOs', async () => {
			const lower = await sandboxNameFor('proj_abc')
			const upper = await sandboxNameFor('PROJ_ABC')
			expect(lower).not.toBe(upper)
		})
	})

	describe('projectId validation', () => {
		it('rejects empty projectId with 400', async () => {
			const req = await signedRequest('/api/v1/status', { projectId: '' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			const body = (await res.json()) as { error: string }
			expect(body.error).toBe('INVALID_PROJECT_ID')
		})

		it('rejects whitespace projectId with 400', async () => {
			const req = await signedRequest('/api/v1/status', { projectId: '   ' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('rejects projectId containing path separators with 400', async () => {
			const req = await signedRequest('/api/v1/status', { projectId: 'proj/../etc' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('rejects projectId with shell metacharacters with 400', async () => {
			const req = await signedRequest('/api/v1/status', { projectId: 'proj;rm -rf /' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('rejects missing projectId with 400', async () => {
			const req = await signedRequest('/api/v1/status', {})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			const body = (await res.json()) as { error: string }
			expect(body.error).toBe('INVALID_PROJECT_ID')
		})

		it('accepts valid alphanumeric projectId', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValue([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
		})
	})

	describe('POST /api/v1/prewarm', () => {
		it('starts the dev server when no port is exposed', async () => {
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.exposePort).toHaveBeenCalledWith(3001, expect.any(Object))
			expect(fakeSandbox.startProcess).toHaveBeenCalled()
		})

		it('returns ok without re-starting when already running', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as { ok: boolean; previewUrl: string }
			expect(body.ok).toBe(true)
			expect(body.previewUrl).toBe('https://3001-warm.workers.dev')
			expect(fakeSandbox.exposePort).not.toHaveBeenCalled()
			expect(fakeSandbox.startProcess).not.toHaveBeenCalled()
		})
	})

	describe('POST /api/v1/start', () => {
		it('writes initial files and returns previewUrl + sandboxId', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 'next-landing-v1',
				files: [
					{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
					{ path: 'src/components/Hero.tsx', content: 'hero' },
				],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as {
				sandboxId: string
				previewUrl: string
				status: string
			}
			expect(body.sandboxId).toBe(FIRST_NAME)
			expect(body.previewUrl).toBe('https://3001-project.workers.dev')
			expect(body.status).toBe('ready')
			expect('revision' in body).toBe(false)
			expect(fakeSandbox.writeFile).toHaveBeenCalledTimes(2)
			expect(fakeSandbox.writeFile).toHaveBeenCalledWith(
				'/app/src/app/page.tsx',
				'export default function Page() {}',
			)
		})

		it('rejects unsafe paths with 400', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [{ path: '../etc/passwd', content: 'pwn' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			expect(fakeSandbox.writeFile).not.toHaveBeenCalled()
		})

		it('starts dev server on cold start', async () => {
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.exposePort).toHaveBeenCalled()
			expect(fakeSandbox.startProcess).toHaveBeenCalled()
		})

		it('starts dev server via shell backgrounding', async () => {
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			await worker.fetch(req, env)
			expect(fakeSandbox.startProcess).toHaveBeenCalled()
			const command = fakeSandbox.startProcess.mock.calls[0][0] as string
			expect(command).toContain('npm run dev')
		})

		it('reuses existing port when sandbox is already running', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.exposePort).not.toHaveBeenCalled()
			expect(fakeSandbox.startProcess).not.toHaveBeenCalled()
			expect(fakeSandbox.writeFile).toHaveBeenCalledOnce()
			const body = (await res.json()) as { previewUrl: string }
			expect(body.previewUrl).toBe('https://3001-warm.workers.dev')
		})
	})

	describe('POST /api/v1/write', () => {
		it('writes file batch into a running sandbox', async () => {
			// Note: getExposedPorts is called twice now (P0-3: pre-write snapshot
			// + ensureDevServer's own check). Use mockResolvedValue (not Once) so
			// both calls see the warm port.
			fakeSandbox.getExposedPorts.mockResolvedValue([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [
					{ path: 'a.ts', content: 'a' },
					{ path: 'b.ts', content: 'b' },
				],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as { previewUrl: string; status: string }
			expect(body.previewUrl).toBe('https://3001-warm.workers.dev')
			expect(body.status).toBe('ready')
			expect(fakeSandbox.writeFile).toHaveBeenCalledTimes(2)
		})

		it('bootstraps the dev server when no port is exposed', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([])
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.exposePort).toHaveBeenCalled()
			expect(fakeSandbox.startProcess).toHaveBeenCalled()
			expect(fakeSandbox.writeFile).toHaveBeenCalledOnce()
		})

		it('P2-15: reports failedPath with scrubbed error code (no raw message leak)', async () => {
			// P2-15: error envelope must be {error: 'WRITE_FAILED'} — NOT the raw
			// `err.message`. Raw messages leak internal paths, container IDs, etc.
			// Caller-supplied `failedPath` echoes back (that's their own input).
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			fakeSandbox.writeFile
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('disk full at /app/.pnpm/internal-path'))
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [
					{ path: 'a.ts', content: 'a' },
					{ path: 'b.ts', content: 'b' },
				],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as { previewUrl: string; failedPath: string; error: string }
			expect(body.failedPath).toBe('b.ts')
			expect(body.error).toBe('WRITE_FAILED')
			// Internal path must NOT leak
			expect(JSON.stringify(body)).not.toContain('/app/.pnpm/internal-path')
			expect(JSON.stringify(body)).not.toContain('disk full')
		})

		it('rejects unsafe paths with 400', async () => {
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: '/etc/passwd', content: 'x' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('rejects empty file batch with 400', async () => {
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('F11: rejects batch with > 200 files as BAD_REQUEST', async () => {
			const files = Array.from({ length: 201 }, (_, i) => ({
				path: `f${i}.ts`,
				content: 'x',
			}))
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files,
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			expect(await res.json()).toEqual({ error: 'BAD_REQUEST' })
		})

		it('F11: rejects batch exceeding 40 MB total content as BAD_REQUEST', async () => {
			// 4 files × 11 MB = 44 MB, over the cap
			const huge = 'x'.repeat(11 * 1024 * 1024)
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [
					{ path: 'a.ts', content: huge },
					{ path: 'b.ts', content: huge },
					{ path: 'c.ts', content: huge },
					{ path: 'd.ts', content: huge },
				],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			expect(await res.json()).toEqual({ error: 'BAD_REQUEST' })
		})

		it('P0-3: writes all files BEFORE booting the dev server (avoid HMR half-batch)', async () => {
			// Cold write: no port exposed yet, dev server not running. Order must be:
			// 1. write all files
			// 2. boot dev server
			// Reversed ordering (boot first) lets Next's file watcher pick up a
			// partially-applied batch and render a broken preview.
			const callLog: string[] = []
			const execSandbox = makeFakeExecSandbox({
				getExposedPorts: vi.fn(() => {
					callLog.push('getExposedPorts')
					return Promise.resolve([])
				}),
				exposePort: vi.fn(() => {
					callLog.push('exposePort')
					return Promise.resolve({
						url: 'https://3001-p-boot.meldar.ai/',
						port: 3001,
						name: undefined,
					})
				}),
				writeFile: vi.fn((path: string) => {
					callLog.push(`writeFile:${path}`)
					return Promise.resolve()
				}),
				exec: vi.fn(() => {
					callLog.push('exec')
					return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })
				}),
			})
			sandboxRegistry.set(FIRST_NAME, execSandbox)

			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [
					{ path: 'a.ts', content: 'a' },
					{ path: 'b.ts', content: 'b' },
				],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)

			const writeIndices = callLog
				.map((entry, i) => (entry.startsWith('writeFile') ? i : -1))
				.filter((i) => i >= 0)
			const firstExecIndex = callLog.indexOf('exec')
			expect(writeIndices.length).toBe(2)
			expect(firstExecIndex).toBeGreaterThan(-1)
			const lastWriteIndex = writeIndices[writeIndices.length - 1] ?? -1
			expect(lastWriteIndex).toBeLessThan(firstExecIndex)
		})

		it('P1-9: emits one structured log per ensureDevServer with timings and path', async () => {
			// SRE contract: one JSON log per ensureDevServer call. Schema includes
			// event name, requestId, projectId, sandboxName, path ('cold'|'warm'),
			// probeMs, exitCode. Cold path = had to start server; warm = already up.
			const logs: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					logs.push(msg)
				}
			})
			try {
				const execSandbox = makeFakeExecSandbox({
					getExposedPorts: vi.fn().mockResolvedValue([]),
					exposePort: vi.fn().mockResolvedValue({
						url: 'https://3001-p.meldar.ai/',
						port: 3001,
						name: undefined,
					}),
				})
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				const req = await signedRequest('/api/v1/write', {
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(200)

				expect(logs).toHaveLength(1)
				const entry = JSON.parse(logs[0] as string) as Record<string, unknown>
				expect(entry.event).toBe('sandbox.dev_server_ready')
				expect(entry.projectId).toBe('proj_first')
				expect(entry.sandboxName).toBe(FIRST_NAME)
				expect(entry.path).toBe('cold')
				expect(entry.exitCode).toBe(0)
				expect(typeof entry.probeMs).toBe('number')
				expect(typeof entry.requestId).toBe('string')
				expect(entry.requestId).toMatch(/^[0-9a-f]{32}$/)
			} finally {
				logSpy.mockRestore()
			}
		})

		it('F8: 2xx response triggers touch(); 4xx/5xx does NOT', async () => {
			// Architect flag: markActive is now discipline via withSandboxActivity
			// wrapper. Success → touch. Error → no touch (fail-open reaper).
			const execSandbox = makeFakeExecSandbox()
			sandboxRegistry.set(FIRST_NAME, execSandbox)

			// Happy path — should touch
			const okReq = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const okRes = await worker.fetch(okReq, env)
			expect(okRes.status).toBe(200)
			expect(execSandbox.touch).toHaveBeenCalledOnce()

			// Failure path — should NOT touch
			execSandbox.touch = vi.fn()
			execSandbox.exec = vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'boom' })
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
			try {
				const failReq = await signedRequest('/api/v1/write', {
					projectId: 'proj_first',
					files: [{ path: 'b.ts', content: 'b' }],
				})
				const failRes = await worker.fetch(failReq, env)
				expect(failRes.status).toBe(500)
				expect(execSandbox.touch).not.toHaveBeenCalled()
			} finally {
				errSpy.mockRestore()
				logSpy.mockRestore()
			}
		})

		it('F4: x-meldar-user-id header is echoed into structured log', async () => {
			const logs: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					logs.push(msg)
				}
			})
			try {
				const execSandbox = makeFakeExecSandbox()
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				// Manually stamp x-meldar-user-id on the signed request
				const body = JSON.stringify({
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const timestamp = FIXED_NOW.toString()
				const signature = await hmacSha256Hex(HMAC_SECRET, `${timestamp}.${body}`)
				const req = new Request('https://sandbox.meldar.ai/api/v1/write', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'x-meldar-timestamp': timestamp,
						'x-meldar-signature': signature,
						'x-meldar-user-id': 'user_abc123',
					},
					body,
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(200)

				expect(logs).toHaveLength(1)
				const entry = JSON.parse(logs[0] as string) as Record<string, unknown>
				expect(entry.userId).toBe('user_abc123')
			} finally {
				logSpy.mockRestore()
			}
		})

		it('F4: malformed x-meldar-user-id is dropped (not logged)', async () => {
			const logs: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					logs.push(msg)
				}
			})
			try {
				const execSandbox = makeFakeExecSandbox()
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				const body = JSON.stringify({
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const timestamp = FIXED_NOW.toString()
				const signature = await hmacSha256Hex(HMAC_SECRET, `${timestamp}.${body}`)
				const req = new Request('https://sandbox.meldar.ai/api/v1/write', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						'x-meldar-timestamp': timestamp,
						'x-meldar-signature': signature,
						// Bad shape (path traversal chars) — pattern rejects and drops
						'x-meldar-user-id': '../../etc/passwd',
					},
					body,
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(200)

				expect(logs).toHaveLength(1)
				const entry = JSON.parse(logs[0] as string) as Record<string, unknown>
				expect(entry.userId).toBeUndefined()
				expect(JSON.stringify(entry)).not.toContain('etc/passwd')
			} finally {
				logSpy.mockRestore()
			}
		})

		it('F3: ensureDevServer failure emits exactly ONE log line (no double-log)', async () => {
			// Reviewer flag: pre-fix, a probe failure produced a structured JSON
			// log AND a free-text console.error. F3 tags WorkerError with
			// loggedAtSource so mapSandboxError skips the redundant tail log.
			const structured: string[] = []
			const textErrors: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					structured.push(msg)
				}
			})
			const errSpy = vi.spyOn(console, 'error').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.includes('[sandbox-worker]')) {
					textErrors.push(msg)
				}
			})
			try {
				const execSandbox = makeFakeExecSandbox({
					exec: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'boom' }),
				})
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				const req = await signedRequest('/api/v1/write', {
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(500)

				expect(structured).toHaveLength(1)
				expect(textErrors).toHaveLength(0)
			} finally {
				logSpy.mockRestore()
				errSpy.mockRestore()
			}
		})

		it('F5: stderrTail is scrubbed of secret-shape tokens before logging', async () => {
			const logs: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					logs.push(msg)
				}
			})
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			try {
				const stderr =
					'Error: bootstrap failed\n' +
					'ANTHROPIC_API_KEY=sk-ant-abcdef1234567890abcdef\n' +
					'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig\n' +
					'DATABASE_URL=postgres://app:supersecretpw@db.neon.tech:5432/prod\n'
				const execSandbox = makeFakeExecSandbox({
					exec: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr }),
				})
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				const req = await signedRequest('/api/v1/write', {
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(500)

				expect(logs).toHaveLength(1)
				const entry = JSON.parse(logs[0] as string) as Record<string, unknown>
				const tail = String(entry.stderrTail ?? '')
				// Secret shapes gone
				expect(tail).not.toContain('sk-ant-abcdef1234567890abcdef')
				expect(tail).not.toContain('eyJhbGciOiJIUzI1NiJ9.payload.sig')
				expect(tail).not.toContain('supersecretpw')
				// Redaction markers present
				expect(tail).toMatch(/\[REDACTED/)
				// Non-secret context preserved
				expect(tail).toContain('bootstrap failed')
			} finally {
				logSpy.mockRestore()
				errSpy.mockRestore()
			}
		})

		it('F1: timeout path emits log with errorSubtype READINESS_TIMEOUT', async () => {
			// Reviewer flag: errorSubtype was dropped on the timeout path because
			// stderrTail was empty. F1 classifies from exitCode alone when stderr
			// is absent, so timeouts show up as READINESS_TIMEOUT in logs.
			// Inject the same exception the real timer produces to avoid fake-timer
			// deadlocks the reviewer explicitly flagged.
			const timeoutError = new WorkerError(
				'DEV_SERVER_TIMEOUT',
				'dev server not ready after 85000ms (readiness=tcp)',
			)
			const logs: string[] = []
			const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
				if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('dev_server_ready')) {
					logs.push(msg)
				}
			})
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			try {
				const execSandbox = makeFakeExecSandbox({
					exec: vi.fn().mockRejectedValue(timeoutError),
				})
				sandboxRegistry.set(FIRST_NAME, execSandbox)

				const req = await signedRequest('/api/v1/write', {
					projectId: 'proj_first',
					files: [{ path: 'a.ts', content: 'a' }],
				})
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(504)

				expect(logs).toHaveLength(1)
				const entry = JSON.parse(logs[0] as string) as Record<string, unknown>
				expect(entry.errorCode).toBe('DEV_SERVER_TIMEOUT')
				expect(entry.errorSubtype).toBe('READINESS_TIMEOUT')
				expect(entry.exitCode).toBe(124)
			} finally {
				logSpy.mockRestore()
				errSpy.mockRestore()
			}
		})
	})

	describe('POST /api/v1/status', () => {
		it('returns previewUrl when sandbox is running', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-running.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as { previewUrl: string; status: string }
			expect(body.previewUrl).toBe('https://3001-running.workers.dev')
			expect(body.status).toBe('ready')
		})

		it('returns 404 when sandbox is not running', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(404)
		})
	})

	describe('POST /api/v1/stop', () => {
		it('returns 200 ok when sandbox stops cleanly', async () => {
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ ok: true })
		})

		it('returns 404 when no process exists (fallback path only)', async () => {
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(404)
		})
	})

	describe('exec-path lifecycle (P0-1)', () => {
		let execSandbox: FakeSandbox

		beforeEach(() => {
			execSandbox = makeFakeExecSandbox()
			sandboxRegistry.set(FIRST_NAME, execSandbox)
		})

		it('stop kills the detached dev server by port and disables keepalive', async () => {
			const stop = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(stop, env)

			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ ok: true })

			const execMock = execSandbox.exec
			expect(execMock).toHaveBeenCalledOnce()
			const killCmd = execMock?.mock.calls[0][0] as string
			expect(killCmd).toContain('pkill -f "next-server"')
			expect(killCmd).toContain('pkill -f "npm run dev"')

			expect(execSandbox.setKeepAlive).toHaveBeenCalledWith(false)
			expect(execSandbox.getProcess).not.toHaveBeenCalled()
		})

		it('stop is idempotent: returns 200 even when nothing is running', async () => {
			execSandbox.exec = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })

			const first = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const firstRes = await worker.fetch(first, env)
			expect(firstRes.status).toBe(200)

			const second = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const secondRes = await worker.fetch(second, env)
			expect(secondRes.status).toBe(200)
			expect(await secondRes.json()).toEqual({ ok: true })
		})

		it('start then stop: after start via exec, stop shells out to kill (no SDK PID involved)', async () => {
			execSandbox.getExposedPorts.mockResolvedValue([])

			const start = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const startRes = await worker.fetch(start, env)
			expect(startRes.status).toBe(200)
			expect(execSandbox.exec).toHaveBeenCalledTimes(1)

			const stop = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const stopRes = await worker.fetch(stop, env)
			expect(stopRes.status).toBe(200)

			expect(execSandbox.exec).toHaveBeenCalledTimes(2)
			const stopCmd = execSandbox.exec?.mock.calls[1][0] as string
			expect(stopCmd).toContain('pkill -f "next-server"')
			expect(execSandbox.setKeepAlive).toHaveBeenCalledWith(true)
			expect(execSandbox.setKeepAlive).toHaveBeenLastCalledWith(false)
		})
	})

	describe('readiness contract split (P0-2)', () => {
		let execSandbox: FakeSandbox

		beforeEach(() => {
			execSandbox = makeFakeExecSandbox()
			execSandbox.getExposedPorts.mockResolvedValue([])
			sandboxRegistry.set(FIRST_NAME, execSandbox)
		})

		it('/start waits for HTTP readiness so the iframe never loads a pre-compile blank', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)

			const cmd = execSandbox.exec?.mock.calls[0][0] as string
			expect(cmd).toContain('/dev/tcp/localhost/3001')
			expect(cmd).toContain('curl -s -o /dev/null')
		})

		it('/prewarm waits for HTTP readiness so the sandbox is actually serving when returned', async () => {
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)

			const cmd = execSandbox.exec?.mock.calls[0][0] as string
			expect(cmd).toContain('/dev/tcp/localhost/3001')
			expect(cmd).toContain('curl -s -o /dev/null')
		})

		it('/write on a cold sandbox (no existing port) waits for HTTP readiness', async () => {
			execSandbox.getExposedPorts.mockResolvedValue([])
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)

			const cmd = execSandbox.exec?.mock.calls[0][0] as string
			expect(cmd).toContain('curl -s -o /dev/null')
		})

		it('/write on a warm sandbox still waits on HTTP readiness (catches mid-compile stale-bundle race)', async () => {
			execSandbox.getExposedPorts.mockResolvedValue([
				{ port: 3001, url: 'https://3001-proj.example.test/' },
			])
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)

			const cmd = execSandbox.exec?.mock.calls[0][0] as string
			expect(cmd).toContain('curl -s -o /dev/null')
		})

		it('dev-server-probe-failed error includes readiness mode in message', async () => {
			execSandbox.exec = vi
				.fn()
				.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'boot failed' })
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
		})
	})

	describe('exec path coverage (P1-12)', () => {
		let execSandbox: FakeSandbox

		beforeEach(() => {
			execSandbox = makeFakeExecSandbox()
			execSandbox.getExposedPorts.mockResolvedValue([])
			sandboxRegistry.set(FIRST_NAME, execSandbox)
		})

		it('exec exitCode=0 → 200 ready', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const body = (await res.json()) as { status: string }
			expect(body.status).toBe('ready')
			expect(execSandbox.exec).toHaveBeenCalledOnce()
		})

		it('exec exitCode!=0 → 500 with error code DEV_SERVER_PROBE_FAILED', async () => {
			execSandbox.exec = vi.fn().mockResolvedValue({
				exitCode: 1,
				stdout: '',
				stderr: 'boot failed: missing dep',
			})
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'DEV_SERVER_PROBE_FAILED' })
		})

		it('exec rejection → 500 with error code DEV_SERVER_PROBE_FAILED', async () => {
			execSandbox.exec = vi.fn().mockRejectedValue(new Error('Shell terminated unexpectedly'))
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'DEV_SERVER_PROBE_FAILED' })
		})

		it('setKeepAlive rejection is swallowed; start still succeeds', async () => {
			execSandbox.setKeepAlive = vi.fn().mockRejectedValue(new Error('keepalive RPC died'))
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(execSandbox.setKeepAlive).toHaveBeenCalledWith(true)
		})

		it('probe command is wrapped in a subshell so probe `exit 1` does not kill the SDK shell session', async () => {
			// Quirk #3 in sandbox SDK notes: `exec` shares ONE persistent shell.
			// `exit` inside an exec command kills the session. The probe loop
			// uses `exit 1` on timeout, so it MUST be wrapped in `( ... )`.
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			await worker.fetch(req, env)
			const cmd = execSandbox.exec?.mock.calls[0][0] as string
			expect(cmd.startsWith('(')).toBe(true)
			expect(cmd.endsWith(')')).toBe(true)
		})

		it('handleStop swallows setKeepAlive rejection and still returns 200', async () => {
			execSandbox.setKeepAlive = vi.fn().mockRejectedValue(new Error('keepalive RPC died'))
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ ok: true })
			expect(execSandbox.exec).toHaveBeenCalledOnce()
			expect(execSandbox.setKeepAlive).toHaveBeenCalledWith(false)
		})

		it('handleStop maps exec failure to 500 INTERNAL via mapSandboxError', async () => {
			execSandbox.exec = vi.fn().mockRejectedValue(new Error('container gone'))
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'INTERNAL' })
		})

		it('reuses already-exposed port without re-exposing', async () => {
			execSandbox.getExposedPorts.mockResolvedValue([
				{ url: 'https://3001-existing.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(execSandbox.exposePort).not.toHaveBeenCalled()
		})
	})

	describe('readiness via startProcess fallback (no-exec path)', () => {
		it('/start calls waitForPort in http mode so the iframe never loads a pre-compile blank', async () => {
			const proc = {
				waitForPort: vi.fn().mockResolvedValue(undefined),
				kill: vi.fn().mockResolvedValue(undefined),
			}
			fakeSandbox.startProcess.mockResolvedValueOnce(proc)
			fakeSandbox.getProcess.mockResolvedValueOnce(null)

			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(proc.waitForPort).toHaveBeenCalledWith(
				3001,
				expect.objectContaining({ mode: 'http', path: '/' }),
			)
		})

		it('/write on a cold sandbox waits for HTTP readiness', async () => {
			const proc = {
				waitForPort: vi.fn().mockResolvedValue(undefined),
				kill: vi.fn().mockResolvedValue(undefined),
			}
			fakeSandbox.startProcess.mockResolvedValueOnce(proc)
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([])

			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(proc.waitForPort).toHaveBeenCalledWith(3001, expect.objectContaining({ mode: 'http' }))
		})

		it('/write on a warm sandbox uses HTTP readiness (catches mid-compile stale-bundle race)', async () => {
			const proc = {
				waitForPort: vi.fn().mockResolvedValue(undefined),
				kill: vi.fn().mockResolvedValue(undefined),
			}
			fakeSandbox.startProcess.mockResolvedValueOnce(proc)
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			fakeSandbox.getExposedPorts.mockResolvedValue([
				{ port: 3001, url: 'https://3001-proj.example.test/' },
			])

			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(proc.waitForPort).toHaveBeenCalledWith(3001, expect.objectContaining({ mode: 'http' }))
		})
	})

	describe('correlation ID (x-meldar-request-id)', () => {
		it('echoes caller-supplied x-meldar-request-id on the response', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			req.headers.set('x-meldar-request-id', 'abcdef0123456789abcdef0123456789')
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(res.headers.get('x-meldar-request-id')).toBe('abcdef0123456789abcdef0123456789')
		})

		it('generates a fresh 32-hex request ID when caller omits the header', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(res.headers.get('x-meldar-request-id')).toMatch(/^[0-9a-f]{32}$/)
		})

		it('echoes the request ID on error responses too', async () => {
			fakeSandbox.getExposedPorts.mockRejectedValueOnce(new Error('boom'))
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			req.headers.set('x-meldar-request-id', '11111111222222223333333344444444')
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(res.headers.get('x-meldar-request-id')).toBe('11111111222222223333333344444444')
		})

		it('echoes the request ID on 401 UNAUTHORIZED', async () => {
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-meldar-request-id': 'aaaabbbbccccddddeeeeffff00001111',
				},
				body: JSON.stringify({ projectId: 'proj_first' }),
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(401)
			expect(res.headers.get('x-meldar-request-id')).toBe('aaaabbbbccccddddeeeeffff00001111')
		})

		it('rejects a malformed request ID header and generates a fresh one', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://x', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			req.headers.set('x-meldar-request-id', 'not-hex-at-all-!@#$')
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const echoed = res.headers.get('x-meldar-request-id')
			expect(echoed).not.toBe('not-hex-at-all-!@#$')
			expect(echoed).toMatch(/^[0-9a-f]{32}$/)
		})
	})

	describe('error envelope', () => {
		it('unknown POST path returns 404 JSON', async () => {
			const req = await signedRequest('/api/v1/nope', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(404)
			expect(res.headers.get('content-type')).toContain('application/json')
		})

		it('GET on a contract endpoint returns 405', async () => {
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', { method: 'GET' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(405)
		})

		it('malformed JSON body returns 400', async () => {
			const timestamp = FIXED_NOW.toString()
			const rawBody = '{not-json'
			const sig = await hmacSha256Hex(HMAC_SECRET, `${timestamp}.${rawBody}`)
			const req = new Request('https://sandbox.meldar.ai/api/v1/status', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-meldar-timestamp': timestamp,
					'x-meldar-signature': sig,
				},
				body: rawBody,
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
		})

		it('handler exceptions are caught and return 500 JSON, never HTML', async () => {
			fakeSandbox.getExposedPorts.mockImplementationOnce(() => {
				throw new Error('boom')
			})
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(res.headers.get('content-type')).toContain('application/json')
		})
	})

	describe('tagged-error dispatch (P1-8)', () => {
		// Substring matching is gone. Untagged SDK errors uniformly map to
		// 500 INTERNAL regardless of message text. Only WorkerError instances
		// thrown by handler code carry a stable code → status mapping.

		it('canary: exec stderr "npm: command not found" returns 500 DEV_SERVER_PROBE_FAILED, not 404', async () => {
			const execSandbox = makeFakeExecSandbox({
				exec: vi.fn().mockResolvedValue({
					exitCode: 127,
					stdout: '',
					stderr: 'npm: command not found',
				}),
			})
			sandboxRegistry.set(FIRST_NAME, execSandbox)

			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'DEV_SERVER_PROBE_FAILED' })
		})

		it('untagged Error("Sandbox quota exhausted") becomes 500 INTERNAL (no substring leak)', async () => {
			fakeSandbox.getExposedPorts.mockRejectedValueOnce(new Error('Sandbox quota exhausted'))
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'INTERNAL' })
		})

		it('untagged Error("Sandbox not found") becomes 500 INTERNAL (no substring leak)', async () => {
			fakeSandbox.getExposedPorts.mockRejectedValueOnce(new Error('Sandbox not found'))
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'INTERNAL' })
		})

		it('exec rejection becomes 500 DEV_SERVER_PROBE_FAILED', async () => {
			const execSandbox = makeFakeExecSandbox({
				exec: vi.fn().mockRejectedValue(new Error('Shell terminated unexpectedly')),
			})
			sandboxRegistry.set(FIRST_NAME, execSandbox)

			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(await res.json()).toEqual({ error: 'DEV_SERVER_PROBE_FAILED' })
		})

		it('error response body is sanitized: never contains message, name, or stack', async () => {
			fakeSandbox.getExposedPorts.mockRejectedValueOnce(
				new Error('SECRET internal stack trace info'),
			)
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			const body = (await res.json()) as Record<string, unknown>
			expect(body).not.toHaveProperty('message')
			expect(body).not.toHaveProperty('name')
			expect(body).not.toHaveProperty('stack')
			expect(JSON.stringify(body)).not.toContain('SECRET')
		})
	})

	describe('setKeepAlive failure logging (P2-14)', () => {
		// P2-14 inverts the prior `.catch(() => {})` swallow: a persistent
		// keep-alive RPC failure means the container will be killed by the
		// SDK's inactivity timer, costing a 15-25s cold restart on the next
		// request. Silent failure here masks an outage. These tests assert
		// the warn-level log fires AND the response still succeeds (best-
		// effort semantics).
		let warnSpy: ReturnType<typeof vi.spyOn>
		let execSandbox: FakeSandbox

		beforeEach(() => {
			warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
			execSandbox = makeFakeExecSandbox()
			sandboxRegistry.set(FIRST_NAME, execSandbox)
		})

		afterEach(() => {
			warnSpy.mockRestore()
		})

		it('logs setKeepAlive(enable) failure during /start (was silent)', async () => {
			execSandbox.setKeepAlive = vi.fn().mockRejectedValue(new Error('keepalive RPC died'))
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const matched = warnSpy.mock.calls.some((args: unknown[]) =>
				String(args[0]).includes('setKeepAlive(enable) failed'),
			)
			expect(matched).toBe(true)
		})

		it('logs setKeepAlive(disable) failure during /stop (was silent)', async () => {
			execSandbox.setKeepAlive = vi.fn().mockRejectedValue(new Error('keepalive RPC died'))
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const matched = warnSpy.mock.calls.some((args: unknown[]) =>
				String(args[0]).includes('setKeepAlive(disable) failed'),
			)
			expect(matched).toBe(true)
		})

		it('does NOT log when setKeepAlive succeeds (happy path stays quiet)', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			const matched = warnSpy.mock.calls.some((args: unknown[]) =>
				String(args[0]).includes('setKeepAlive'),
			)
			expect(matched).toBe(false)
		})
	})

	describe('HMAC fail-closed on missing secret (P2-16)', () => {
		// Without this guard, an empty HMAC_SECRET would silently 401 every
		// request because no client signature could ever match. Operators
		// debugging "auth broken" would chase phantom credentials while the
		// real fault — unset wrangler secret — masquerades as auth failure.
		// CONFIG_ERROR 503 makes the cause unambiguous; MELDAR_DEV_MODE=1
		// keeps `wrangler dev` ergonomic without leaking into production.
		let errorSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		})

		afterEach(() => {
			errorSpy.mockRestore()
		})

		it('returns 503 CONFIG_ERROR when HMAC_SECRET is empty string', async () => {
			const brokenEnv: SandboxWorkerEnv = { ...env, HMAC_SECRET: '' }
			// Body signed with the real test secret would never match an empty
			// secret server-side, but we MUST short-circuit before HMAC verify
			// so the response is CONFIG_ERROR (503), not UNAUTHORIZED (401).
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, brokenEnv)
			expect(res.status).toBe(503)
			expect(await res.json()).toEqual({ error: 'CONFIG_ERROR' })
		})

		it('returns 503 CONFIG_ERROR when HMAC_SECRET is undefined', async () => {
			const brokenEnv = {
				...env,
				HMAC_SECRET: undefined,
			} as unknown as SandboxWorkerEnv
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, brokenEnv)
			expect(res.status).toBe(503)
			expect(await res.json()).toEqual({ error: 'CONFIG_ERROR' })
		})

		it('logs the misconfiguration so operators can spot it in CF logs', async () => {
			const brokenEnv: SandboxWorkerEnv = { ...env, HMAC_SECRET: '' }
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			await worker.fetch(req, brokenEnv)
			const matched = errorSpy.mock.calls.some((args: unknown[]) =>
				String(args[0]).includes('HMAC_SECRET is not configured'),
			)
			expect(matched).toBe(true)
		})

		it('does NOT short-circuit when MELDAR_DEV_MODE=1 (wrangler dev escape hatch)', async () => {
			// Dev mode bypasses the config check so wrangler dev boots without
			// `wrangler secret put`. The downstream HMAC verify will still 401
			// because the empty secret can't validate the test signature —
			// that's the intended dev experience (set the secret to test auth).
			const devEnv: SandboxWorkerEnv = {
				...env,
				HMAC_SECRET: '',
				MELDAR_DEV_MODE: '1',
			}
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, devEnv)
			expect(res.status).toBe(401)
			expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' })
		})

		it('healthz remains reachable even when HMAC_SECRET is missing', async () => {
			// /healthz is the smoke test for "is this worker alive at all?" —
			// if a misconfigured secret 503'd it, monitoring would scream when
			// the worker is actually fine; only client traffic is broken.
			const brokenEnv: SandboxWorkerEnv = { ...env, HMAC_SECRET: '' }
			const req = new Request('https://sandbox.meldar.ai/healthz')
			const res = await worker.fetch(req, brokenEnv)
			expect(res.status).toBe(200)
			expect(await res.json()).toEqual({ status: 'ok' })
		})
	})

	describe('reaper integration (P1-7: idle-TTL touch)', () => {
		it('touches sandbox after successful prewarm', async () => {
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.touch).toHaveBeenCalledOnce()
		})

		it('touches sandbox after successful start', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.touch).toHaveBeenCalledOnce()
		})

		it('touches sandbox after successful write', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.txt', content: 'x' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.touch).toHaveBeenCalledOnce()
		})

		it('touches sandbox after successful status', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.touch).toHaveBeenCalledOnce()
		})

		it('does NOT touch sandbox on validation failure (invalid projectId)', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'bad/projectId',
				userId: 'user_1',
				template: 't',
				files: [],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			expect(fakeSandbox.touch).not.toHaveBeenCalled()
		})

		it('does NOT touch sandbox on unsafe path rejection', async () => {
			const req = await signedRequest('/api/v1/start', {
				projectId: 'proj_first',
				userId: 'user_1',
				template: 't',
				files: [{ path: '../etc/passwd', content: 'x' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(400)
			expect(fakeSandbox.touch).not.toHaveBeenCalled()
		})

		it('does NOT touch sandbox when ensureDevServer fails', async () => {
			fakeSandbox.exposePort.mockRejectedValueOnce(new Error('boom'))
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(500)
			expect(fakeSandbox.touch).not.toHaveBeenCalled()
		})

		it('touch failure does NOT break the response (best-effort)', async () => {
			fakeSandbox.touch = vi.fn().mockRejectedValue(new Error('storage transient'))
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
			expect(fakeSandbox.touch).toHaveBeenCalledOnce()
		})

		it('legacy sandbox without touch method still works (no error)', async () => {
			const legacySandbox = makeFakeSandbox()
			legacySandbox.touch = undefined
			sandboxRegistry.set(FIRST_NAME, legacySandbox)
			const req = await signedRequest('/api/v1/prewarm', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(200)
		})
	})
})
