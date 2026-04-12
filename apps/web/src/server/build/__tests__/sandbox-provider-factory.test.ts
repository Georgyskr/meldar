import { afterEach, describe, expect, it, vi } from 'vitest'

const MockCtor = vi.fn(function (this: Record<string, boolean>) {
	this._mock = true
})

vi.mock('@meldar/sandbox', () => ({
	CloudflareSandboxProvider: MockCtor,
}))

async function freshFactory() {
	vi.resetModules()
	const mod = await import('../sandbox-provider-factory')
	return mod.tryCreateSandboxProvider
}

describe('tryCreateSandboxProvider', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		MockCtor.mockClear()
	})

	it('returns a SandboxProvider when both env vars are set', async () => {
		vi.stubEnv('CF_SANDBOX_WORKER_URL', 'https://sandbox.workers.dev')
		vi.stubEnv('CF_SANDBOX_HMAC_SECRET', 'test-secret')

		const tryCreate = await freshFactory()
		const result = tryCreate()

		expect(result).toBeDefined()
		expect(MockCtor).toHaveBeenCalledWith({
			workerUrl: 'https://sandbox.workers.dev',
			hmacSecret: 'test-secret',
		})
	})

	it('returns undefined when CF_SANDBOX_WORKER_URL is missing', async () => {
		vi.stubEnv('CF_SANDBOX_HMAC_SECRET', 'test-secret')

		const tryCreate = await freshFactory()
		const result = tryCreate()

		expect(result).toBeUndefined()
		expect(MockCtor).not.toHaveBeenCalled()
	})

	it('returns undefined when CF_SANDBOX_HMAC_SECRET is missing', async () => {
		vi.stubEnv('CF_SANDBOX_WORKER_URL', 'https://sandbox.workers.dev')

		const tryCreate = await freshFactory()
		const result = tryCreate()

		expect(result).toBeUndefined()
		expect(MockCtor).not.toHaveBeenCalled()
	})

	it('caches the result — second call returns same instance', async () => {
		vi.stubEnv('CF_SANDBOX_WORKER_URL', 'https://sandbox.workers.dev')
		vi.stubEnv('CF_SANDBOX_HMAC_SECRET', 'test-secret')

		const tryCreate = await freshFactory()
		const first = tryCreate()
		const second = tryCreate()

		expect(first).toBe(second)
		expect(MockCtor).toHaveBeenCalledTimes(1)
	})

	it('caches null — once env vars were missing, does not re-check', async () => {
		const tryCreate = await freshFactory()
		const first = tryCreate()
		expect(first).toBeUndefined()

		vi.stubEnv('CF_SANDBOX_WORKER_URL', 'https://sandbox.workers.dev')
		vi.stubEnv('CF_SANDBOX_HMAC_SECRET', 'test-secret')

		const second = tryCreate()
		expect(second).toBeUndefined()
		expect(MockCtor).not.toHaveBeenCalled()
	})
})
