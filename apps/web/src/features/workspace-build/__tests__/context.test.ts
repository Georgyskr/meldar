import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { describe, expect, it } from 'vitest'
import {
	type WorkspaceBuildState,
	workspaceBuildInitialState,
	workspaceBuildReducer,
} from '../context'

const seed = (overrides: Partial<WorkspaceBuildState> = {}): WorkspaceBuildState => ({
	...workspaceBuildInitialState(null),
	...overrides,
})

describe('workspaceBuildReducer', () => {
	it('starts with the initial preview URL passed to initialState', () => {
		const state = workspaceBuildInitialState('https://sandbox.example.com/preview-x')
		expect(state.previewUrl).toBe('https://sandbox.example.com/preview-x')
		expect(state.lastBuildAt).toBeNull()
	})

	it('updates previewUrl on sandbox_ready', () => {
		const event: OrchestratorEvent = {
			type: 'sandbox_ready',
			previewUrl: 'https://sandbox.example.com/new',
			revision: 3,
		}
		const next = workspaceBuildReducer(seed(), event)
		expect(next.previewUrl).toBe('https://sandbox.example.com/new')
	})

	it('overwrites a prior previewUrl on a later sandbox_ready', () => {
		const next = workspaceBuildReducer(seed({ previewUrl: 'https://old.example.com' }), {
			type: 'sandbox_ready',
			previewUrl: 'https://new.example.com',
			revision: 2,
		})
		expect(next.previewUrl).toBe('https://new.example.com')
	})

	it('records lastBuildAt on committed events', () => {
		const event: OrchestratorEvent = {
			type: 'committed',
			buildId: 'b1',
			tokenCost: 100,
			actualCents: 1,
			fileCount: 1,
		}
		const before = Date.now()
		const next = workspaceBuildReducer(seed(), event)
		expect(next.lastBuildAt).not.toBeNull()
		expect(next.lastBuildAt ?? 0).toBeGreaterThanOrEqual(before)
	})

	it('does not change state on file_written events', () => {
		const before = seed({ previewUrl: 'https://x.example.com', lastBuildAt: 1700000000 })
		const next = workspaceBuildReducer(before, {
			type: 'file_written',
			path: 'a.ts',
			contentHash: 'h',
			sizeBytes: 1,
			fileIndex: 0,
		})
		expect(next).toBe(before)
	})

	it('does not change state on started or prompt_sent events', () => {
		const before = seed({ previewUrl: 'https://x.example.com' })
		const next1 = workspaceBuildReducer(before, {
			type: 'started',
			buildId: 'b',
			projectId: 'p',
		})
		const next2 = workspaceBuildReducer(before, {
			type: 'prompt_sent',
			promptHash: 'h',
			estimatedCents: 5,
		})
		expect(next1).toBe(before)
		expect(next2).toBe(before)
	})

	it('does not change state on failed events (error display lives in BuildLog, not in shared state)', () => {
		const before = seed({ previewUrl: 'https://x.example.com' })
		const next = workspaceBuildReducer(before, {
			type: 'failed',
			reason: 'boom',
			code: 'unknown',
		})
		expect(next).toBe(before)
	})
})
