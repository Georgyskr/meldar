import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/ui', () => ({
	toast: { error: vi.fn() },
}))

import { toast } from '@/shared/ui'
import { handleSseEvent } from '../lib/handle-sse-event'

describe('handleSseEvent', () => {
	it('publishes every event to the dispatch function', () => {
		const publish = vi.fn()
		const event: OrchestratorEvent = {
			type: 'file_written',
			path: 'src/app/page.tsx',
			contentHash: 'h',
			sizeBytes: 100,
			fileIndex: 0,
		}
		handleSseEvent(event, publish)
		expect(publish).toHaveBeenCalledWith(event)
	})

	it('shows user-facing reason and suggestion in toast on "failed" events', () => {
		const publish = vi.fn()
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		handleSseEvent(
			{
				type: 'failed',
				reason: 'The AI produced a malformed response.',
				code: 'tool_input_invalid',
				suggestion: 'Try again — this is usually a one-off glitch.',
			},
			publish,
		)

		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'failed' }))
		expect(toast.error).toHaveBeenCalledWith(
			'The AI produced a malformed response.',
			'Try again — this is usually a one-off glitch.',
		)
		expect(spy).toHaveBeenCalled()

		spy.mockRestore()
	})

	it('shows reason without suggestion when suggestion is absent', () => {
		const publish = vi.fn()
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		handleSseEvent({ type: 'failed', reason: 'Unknown error' }, publish)

		expect(toast.error).toHaveBeenCalledWith('Unknown error', undefined)

		vi.restoreAllMocks()
	})

	it('does not fire toast for non-failed events', () => {
		const publish = vi.fn()
		vi.mocked(toast.error).mockClear()

		handleSseEvent(
			{ type: 'committed', buildId: 'b', tokenCost: 5, actualCents: 1, fileCount: 2 },
			publish,
		)

		expect(toast.error).not.toHaveBeenCalled()
	})

	it('fires toast on "pipeline_failed" events', () => {
		const publish = vi.fn()
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		handleSseEvent({ type: 'pipeline_failed', reason: 'Card build crashed', cardId: 'c1' }, publish)

		expect(publish).toHaveBeenCalled()
		expect(toast.error).toHaveBeenCalledWith('Card build crashed')
		expect(spy).toHaveBeenCalled()

		spy.mockRestore()
	})

	it('publishes "disconnected" events but does NOT show a toast with a technical string', () => {
		const publish = vi.fn()
		vi.mocked(toast.error).mockClear()
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		handleSseEvent(
			{
				type: 'disconnected',
				reason: 'Lost connection while waiting for update.',
				code: 'lost_contact',
			},
			publish,
		)

		expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'disconnected' }))
		expect(toast.error).not.toHaveBeenCalled()

		vi.restoreAllMocks()
	})

	it('does NOT treat "deadline" disconnects as errors (silent)', () => {
		const publish = vi.fn()
		vi.mocked(toast.error).mockClear()
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		handleSseEvent(
			{
				type: 'disconnected',
				reason: 'Still waiting — refresh to see the latest.',
				code: 'deadline',
			},
			publish,
		)

		expect(publish).toHaveBeenCalled()
		expect(toast.error).not.toHaveBeenCalled()

		vi.restoreAllMocks()
	})
})
