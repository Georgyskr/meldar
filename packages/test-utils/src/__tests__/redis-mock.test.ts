/**
 * Tests for the Upstash Redis test mock factory. The factory's job is to
 * confine the unsafe `as unknown as Redis` cast to one place. Type safety on
 * the handler methods is enforced at the call site via Pick<Redis, 'eval' | 'get'>.
 */

import { describe, expect, it, vi } from 'vitest'
import { makeRedisMock } from '../redis-mock'

describe('makeRedisMock', () => {
	it('exposes only the methods provided in handlers', async () => {
		const evalFn = vi.fn().mockResolvedValue([1, 100])
		const redis = makeRedisMock({ eval: evalFn })

		const result = await redis.eval('script', ['key1'], ['100', '200'])

		expect(evalFn).toHaveBeenCalledOnce()
		expect(result).toEqual([1, 100])
	})

	it('exposes get when provided', async () => {
		const getFn = vi.fn().mockResolvedValue('42')
		const redis = makeRedisMock({ get: getFn, eval: vi.fn() })

		const result = await redis.get('mykey')

		expect(getFn).toHaveBeenCalledWith('mykey')
		expect(result).toBe('42')
	})
})
