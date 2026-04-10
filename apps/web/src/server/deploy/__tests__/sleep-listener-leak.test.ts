import { getEventListeners } from 'node:events'
import { describe, expect, it } from 'vitest'

import { sleep } from '../vercel-deploy'

describe('sleep abort listener cleanup', () => {
	it('removes abort listener after timer fires normally', async () => {
		const controller = new AbortController()

		const before = getEventListeners(controller.signal, 'abort').length

		await sleep(10, controller.signal)

		const after = getEventListeners(controller.signal, 'abort').length
		expect(after).toBe(before)
	})

	it('cleans up timer when signal aborts', async () => {
		const controller = new AbortController()

		const promise = sleep(60_000, controller.signal)
		controller.abort()

		await expect(promise).rejects.toThrow('aborted')
	})
})
