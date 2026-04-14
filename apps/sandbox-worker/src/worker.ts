// Re-export the reaper-augmented subclass under the `Sandbox` binding name
// so the wrangler `durable_objects.bindings[].class_name = "Sandbox"` keeps
// resolving — switching the binding requires a migration. Wire-compat with
// existing DO IDs is preserved because MeldarSandbox extends Sandbox.
export { MeldarSandbox as Sandbox } from './meldar-sandbox'

export default {
	async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/healthz') {
			return new Response(
				JSON.stringify({
					status: 'ok',
					host: url.host,
					bindings: Object.keys(env),
					hasSandbox: !!env.Sandbox,
					hasHmacSecret: !!env.HMAC_SECRET,
				}),
				{ headers: { 'content-type': 'application/json' } },
			)
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
			// Never surface err.message/stack in the body — operators still get
			// the full error in CF logs (which are auth-gated).
			console.error('[sandbox-worker] fatal:', err)
			return new Response(JSON.stringify({ error: 'WORKER_INIT_FAILED' }), {
				status: 500,
				headers: { 'content-type': 'application/json' },
			})
		}
	},
}
