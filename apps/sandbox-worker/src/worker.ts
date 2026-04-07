/**
 * Meldar Sandbox Spike — Cloudflare Worker host
 *
 * Responsibilities:
 *   1. Serve the iframe host page (from /public/index.html via the assets binding).
 *   2. Proxy preview URL requests to the sandbox (proxyToSandbox must run first).
 *   3. On /api/sandbox, spawn/reuse a sandbox, start `next dev` inside it, expose port 3001, return the preview URL.
 *   4. On /api/write, accept a new file body and write it into the sandbox via writeFile() — proves the "AI generates files → iframe updates" loop.
 *   5. On /api/stop, kill the sandbox process cleanly for timing measurements.
 */
import { getSandbox, proxyToSandbox, type Sandbox } from '@cloudflare/sandbox'

export { Sandbox } from '@cloudflare/sandbox'

type Env = {
	Sandbox: DurableObjectNamespace<Sandbox>
	Assets: Fetcher
}

const SANDBOX_ID = 'meldar-spike'
const NEXT_PORT = 3001
const PROCESS_ID = 'next-dev-server'

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CRITICAL: proxyToSandbox must run first. It intercepts preview URL requests
		// (e.g., https://3001-meldar-spike-{token}.localhost:8787/*) and forwards them
		// to the running Next.js dev server inside the container.
		const proxied = await proxyToSandbox(request, env)
		if (proxied) return proxied

		const url = new URL(request.url)

		if (url.pathname === '/api/sandbox') {
			return handleSandboxStart(url, env)
		}

		if (url.pathname === '/api/write' && request.method === 'POST') {
			return handleWriteFile(request, env)
		}

		if (url.pathname === '/api/stop') {
			return handleStop(env)
		}

		// `run_worker_first: true` means we receive every request. Fall through to the
		// static asset binding so /public/index.html is served for non-API paths on the
		// host domain. Preview URL subdomain requests were already intercepted above by
		// proxyToSandbox(), so we only reach here for host-page traffic.
		return env.Assets.fetch(request)
	},
}

/**
 * Start (or reuse) the sandbox. If no Next.js dev server is running, start one
 * and expose port 3001. Returns the preview URL as JSON.
 */
async function handleSandboxStart(url: URL, env: Env): Promise<Response> {
	const t0 = Date.now()
	const sandbox = getSandbox(env.Sandbox, SANDBOX_ID)

	// Check if port 3001 is already exposed (warm reuse)
	const existingPorts = await sandbox.getExposedPorts(url.host)
	const existing = existingPorts.find((p) => p.port === NEXT_PORT)

	if (existing) {
		return Response.json({
			url: existing.url,
			warm: true,
			elapsedMs: Date.now() - t0,
		})
	}

	// Cold start: expose the port, then kick off `next dev` inside the container.
	const port = await sandbox.exposePort(NEXT_PORT, { hostname: url.host })

	await sandbox.startProcess('npm run dev', {
		processId: PROCESS_ID,
		cwd: '/app',
		env: {
			PORT: String(NEXT_PORT),
			HOSTNAME: '0.0.0.0',
		},
	})

	// Wait until Next.js is actually listening on 3001 before returning the URL
	const process = await sandbox.getProcess(PROCESS_ID)
	if (process) {
		await process.waitForPort(NEXT_PORT)
	}

	return Response.json({
		url: port.url,
		warm: false,
		elapsedMs: Date.now() - t0,
	})
}

/**
 * Overwrite a file inside the sandbox at an arbitrary path. Used to prove the
 * "AI generates files → HMR picks up change → iframe updates" loop.
 * Body shape: { path: string, content: string }
 */
async function handleWriteFile(request: Request, env: Env): Promise<Response> {
	const body = (await request.json()) as { path?: string; content?: string }
	if (!body.path || typeof body.content !== 'string') {
		return Response.json({ error: 'path and content required' }, { status: 400 })
	}

	const sandbox = getSandbox(env.Sandbox, SANDBOX_ID)
	const t0 = Date.now()
	await sandbox.writeFile(`/app/${body.path.replace(/^\/+/, '')}`, body.content)
	return Response.json({
		ok: true,
		elapsedMs: Date.now() - t0,
		path: body.path,
	})
}

/**
 * Stop the sandbox process for timing a true cold start on the next request.
 */
async function handleStop(env: Env): Promise<Response> {
	const sandbox = getSandbox(env.Sandbox, SANDBOX_ID)
	try {
		const process = await sandbox.getProcess(PROCESS_ID)
		if (process) {
			await process.kill?.()
		}
	} catch (err) {
		return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
	}
	return Response.json({ ok: true })
}
