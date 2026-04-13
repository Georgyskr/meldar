export { Sandbox } from '@cloudflare/sandbox'

export default {
	async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/healthz') {
			return new Response(JSON.stringify({
				status: 'ok',
				host: url.host,
				bindings: Object.keys(env),
				hasSandbox: !!env.Sandbox,
				hasHmacSecret: !!env.HMAC_SECRET,
			}), { headers: { 'content-type': 'application/json' } })
		}

		try {
			const { getSandbox, proxyToSandbox } = await import('@cloudflare/sandbox')
			const { createSandboxWorker } = await import('./handler')

			const handler = createSandboxWorker({
				getSandbox: (ns: unknown, id: string) => getSandbox(ns as never, id),
				proxyToSandbox: async (req: Request, workerEnv: unknown) => {
					try {
						return await proxyToSandbox(req, workerEnv as never)
					} catch {
						return null
					}
				},
			})

			return await handler.fetch(request, env as never)
		} catch (err) {
			console.error('[sandbox-worker] fatal:', err)
			return new Response(JSON.stringify({
				error: 'WORKER_INIT_FAILED',
				message: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
			}), { status: 500, headers: { 'content-type': 'application/json' } })
		}
	},
}
