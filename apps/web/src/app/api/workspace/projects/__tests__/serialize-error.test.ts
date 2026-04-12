import { afterEach, describe, expect, it, vi } from 'vitest'

describe('serializeError stack stripping (Finding #18)', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('omits stack in production', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const { serializeError } = await import('../serialize-error')
		const err = new Error('boom')
		err.stack = 'Error: boom\n    at foo.ts:1\n    at bar.ts:2'
		const result = serializeError(err)
		expect(result).not.toHaveProperty('stack')
	})

	it('includes stack in development', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		const { serializeError } = await import('../serialize-error')
		const err = new Error('boom')
		err.stack = 'Error: boom\n    at foo.ts:1\n    at bar.ts:2'
		const result = serializeError(err)
		expect(result).toHaveProperty('stack')
	})

	it('handles non-Error values', async () => {
		const { serializeError } = await import('../serialize-error')
		const result = serializeError('string error')
		expect(result.message).toBe('string error')
	})

	it('recursively serializes cause', async () => {
		const { serializeError } = await import('../serialize-error')
		const cause = new Error('root cause')
		const err = new Error('wrapper', { cause })
		const result = serializeError(err)
		expect(result.cause).toBeDefined()
		expect((result.cause as Record<string, unknown>).message).toBe('root cause')
	})

	it('truncates cause chain deeper than maxDepth', async () => {
		const { serializeError } = await import('../serialize-error')
		let deepError: Error = new Error('root')
		for (let i = 0; i < 100; i++) {
			deepError = new Error(`level-${i}`, { cause: deepError })
		}
		const result = serializeError(deepError)

		let depth = 0
		let current: Record<string, unknown> | undefined = result
		while (current?.cause) {
			depth++
			current = current.cause as Record<string, unknown>
		}
		expect(depth).toBeLessThanOrEqual(6)
		expect(current?.message).toBe('[cause chain truncated]')
	})
})
