import { getSandbox, proxyToSandbox, type Sandbox } from '@cloudflare/sandbox'
import { createSandboxWorker, type SandboxWorkerEnv } from './handler'

export { Sandbox } from '@cloudflare/sandbox'

const handler = createSandboxWorker({
	getSandbox: (ns, id) => getSandbox(ns, id),
	proxyToSandbox: (request, env) =>
		proxyToSandbox(request, env as { Sandbox: DurableObjectNamespace<Sandbox> }),
})

export default {
	fetch(request: Request, env: SandboxWorkerEnv): Promise<Response> {
		return handler.fetch(request, env)
	},
}
