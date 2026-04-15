import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSnapshot, toast } from '../toast-store'

describe('toast store dedup', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		for (const item of getSnapshot()) {
			toast.dismiss(item.id)
		}
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('shows a single toast for identical (type, title, description) within the dedup window', () => {
		toast.error('Build failed', 'Something went wrong')
		toast.error('Build failed', 'Something went wrong')
		toast.error('Build failed', 'Something went wrong')

		const items = getSnapshot()
		expect(items).toHaveLength(1)
		expect(items[0].title).toBe('Build failed')
	})

	it('treats different titles as distinct', () => {
		toast.error('Build failed', 'reason A')
		toast.error('Setup stalled', 'reason A')

		expect(getSnapshot()).toHaveLength(2)
	})

	it('treats different descriptions as distinct', () => {
		toast.error('Build failed', 'reason A')
		toast.error('Build failed', 'reason B')

		expect(getSnapshot()).toHaveLength(2)
	})

	it('lets the same content show again after the dedup window expires', () => {
		toast.error('Build failed', 'X')
		toast.dismiss(getSnapshot()[0].id)
		vi.advanceTimersByTime(11_000)

		toast.error('Build failed', 'X')
		expect(getSnapshot()).toHaveLength(1)
	})
})
