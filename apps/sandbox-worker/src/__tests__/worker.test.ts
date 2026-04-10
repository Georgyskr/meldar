import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSandboxWorker, type SandboxWorkerEnv } from '../handler'
import { hmacSha256Hex } from '../hmac'

const HMAC_SECRET = 'test-secret-deadbeef'
const FIXED_NOW = 1_700_000_000_000

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
		...overrides,
	}
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

	beforeEach(() => {
		sandboxRegistry = new Map()
		fakeSandbox = makeFakeSandbox()
		getSandboxFn = vi.fn((_ns: unknown, id: string) => {
			let s = sandboxRegistry.get(id)
			if (!s) {
				s = id === 'project-proj_first' ? fakeSandbox : makeFakeSandbox()
				sandboxRegistry.set(id, s)
			}
			return s
		})
		// Ensure the default fakeSandbox is bound to "project-proj_first" for the
		// canonical projectId used across happy-path tests.
		sandboxRegistry.set('project-proj_first', fakeSandbox)
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
			expect(ids).toContain('project-proj_alpha')
			expect(ids).toContain('project-proj_beta')
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
			expect(names.every((n) => n === 'project-proj_first')).toBe(true)
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
				revision: number
			}
			expect(body.sandboxId).toBe('project-proj_first')
			expect(body.previewUrl).toBe('https://3001-project.workers.dev')
			expect(body.status).toBe('ready')
			expect(body.revision).toBe(0)
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
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
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

		it('returns 404 when sandbox is not running', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([])
			const req = await signedRequest('/api/v1/write', {
				projectId: 'proj_first',
				files: [{ path: 'a.ts', content: 'a' }],
			})
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(404)
		})

		it('reports failedPath in 200 body when a write fails mid-batch', async () => {
			fakeSandbox.getExposedPorts.mockResolvedValueOnce([
				{ url: 'https://3001-warm.workers.dev', port: 3001, status: 'active' },
			])
			fakeSandbox.writeFile
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('disk full'))
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
			expect(body.error).toContain('disk full')
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

		it('returns 404 when no process exists', async () => {
			fakeSandbox.getProcess.mockResolvedValueOnce(null)
			const req = await signedRequest('/api/v1/stop', { projectId: 'proj_first' })
			const res = await worker.fetch(req, env)
			expect(res.status).toBe(404)
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

	describe('mapSandboxError error-message pinning', () => {
		const cases: Array<{ message: string; expected: number }> = [
			{ message: 'Sandbox quota exhausted', expected: 503 },
			{ message: 'Rate limit exceeded', expected: 503 },
			{ message: 'Container is already running', expected: 409 },
			{ message: 'Conflict: sandbox in use', expected: 409 },
			{ message: 'Sandbox not found', expected: 404 },
			{ message: 'Something unexpected', expected: 500 },
		]

		for (const { message, expected } of cases) {
			it(`maps "${message}" to ${expected}`, async () => {
				fakeSandbox.getExposedPorts.mockRejectedValueOnce(new Error(message))
				const req = await signedRequest('/api/v1/status', { projectId: 'proj_first' })
				const res = await worker.fetch(req, env)
				expect(res.status).toBe(expected)
				expect(res.headers.get('content-type')).toContain('application/json')
			})
		}
	})
})
