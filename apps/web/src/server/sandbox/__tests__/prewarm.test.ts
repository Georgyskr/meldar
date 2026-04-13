import { describe, expect, it, vi } from 'vitest'

describe('prewarmSandbox', () => {
	it('calls CloudflareSandboxProvider.prewarm with the project ID', async () => {
		const prewarmSpy = vi.fn().mockResolvedValue(undefined)

		vi.doMock('@meldar/sandbox', () => ({
			CloudflareSandboxProvider: class {
				static fromEnv() {
					return { prewarm: prewarmSpy }
				}
			},
		}))

		const { prewarmSandbox } = await import('../prewarm')

		await prewarmSandbox('proj_123')

		expect(prewarmSpy).toHaveBeenCalledWith('proj_123')
	})

	it('does not throw when sandbox env vars are missing', async () => {
		vi.doMock('@meldar/sandbox', () => ({
			CloudflareSandboxProvider: class {
				static fromEnv() {
					throw new Error('missing env vars: CF_SANDBOX_WORKER_URL')
				}
			},
		}))

		vi.resetModules()
		const { prewarmSandbox } = await import('../prewarm')

		await expect(prewarmSandbox('proj_123')).resolves.not.toThrow()
	})

	it('does not throw when prewarm request fails', async () => {
		const prewarmSpy = vi.fn().mockRejectedValue(new Error('network error'))

		vi.doMock('@meldar/sandbox', () => ({
			CloudflareSandboxProvider: class {
				static fromEnv() {
					return { prewarm: prewarmSpy }
				}
			},
		}))

		vi.resetModules()
		const { prewarmSandbox } = await import('../prewarm')

		await expect(prewarmSandbox('proj_123')).resolves.not.toThrow()
	})
})
