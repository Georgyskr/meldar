import { CloudflareSandboxProvider, type SandboxProvider } from '@meldar/sandbox'

let cached: SandboxProvider | undefined | null

export function tryCreateSandboxProvider(): SandboxProvider | undefined {
	if (cached === null) return undefined
	if (cached) return cached

	const workerUrl = process.env.CF_SANDBOX_WORKER_URL
	const hmacSecret = process.env.CF_SANDBOX_HMAC_SECRET
	if (!workerUrl || !hmacSecret) {
		cached = null
		return undefined
	}

	cached = new CloudflareSandboxProvider({ workerUrl, hmacSecret })
	return cached
}
