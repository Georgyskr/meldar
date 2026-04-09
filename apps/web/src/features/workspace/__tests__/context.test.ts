import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/features/kanban'
import {
	type WorkspaceBuildState,
	workspaceBuildInitialState,
	workspaceBuildReducer,
} from '../context'

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
	return {
		id: 'card-1',
		projectId: 'proj-1',
		parentId: 'milestone-1',
		position: 0,
		state: 'ready',
		required: false,
		title: 'Test card',
		description: null,
		taskType: 'feature',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'user',
		tokenCostEstimateMin: null,
		tokenCostEstimateMax: null,
		tokenCostActual: null,
		dependsOn: [],
		blockedReason: null,
		lastBuildId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		builtAt: null,
		...overrides,
	}
}

const seed = (overrides: Partial<WorkspaceBuildState> = {}): WorkspaceBuildState => ({
	...workspaceBuildInitialState({ initialPreviewUrl: null, initialKanbanCards: [] }),
	...overrides,
})

describe('workspaceBuildReducer', () => {
	it('starts with the initial preview URL passed to initialState', () => {
		const state = workspaceBuildInitialState({
			initialPreviewUrl: 'https://sandbox.example.com/preview-x',
			initialKanbanCards: [],
		})
		expect(state.previewUrl).toBe('https://sandbox.example.com/preview-x')
		expect(state.lastBuildAt).toBeNull()
		expect(state.cards).toEqual([])
		expect(state.lastBuildReceipt).toBeNull()
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

	it('does not change state on prompt_sent events', () => {
		const before = seed({ previewUrl: 'https://x.example.com' })
		const next = workspaceBuildReducer(before, {
			type: 'prompt_sent',
			promptHash: 'h',
			estimatedCents: 5,
		})
		expect(next).toBe(before)
	})

	it('transitions card to building on started event with kanbanCardId', () => {
		const c = makeCard({ id: 'c1', state: 'ready' })
		const before = seed({ cards: [c] })
		const next = workspaceBuildReducer(before, {
			type: 'started',
			buildId: 'b',
			projectId: 'p',
			kanbanCardId: 'c1',
		})
		expect(next.cards[0].state).toBe('building')
	})

	it('does not mutate cards on started without kanbanCardId', () => {
		const c = makeCard({ id: 'c1', state: 'ready' })
		const before = seed({ cards: [c] })
		const next = workspaceBuildReducer(before, {
			type: 'started',
			buildId: 'b',
			projectId: 'p',
		})
		expect(next.cards).toBe(before.cards)
	})

	it('transitions card to built and sets receipt on committed event', () => {
		const c = makeCard({ id: 'c1', state: 'building', title: 'Nav bar' })
		const before = seed({ cards: [c] })
		const next = workspaceBuildReducer(before, {
			type: 'committed',
			buildId: 'b1',
			tokenCost: 5,
			actualCents: 1,
			fileCount: 3,
			kanbanCardId: 'c1',
		})
		expect(next.cards[0].state).toBe('built')
		expect(next.cards[0].tokenCostActual).toBe(5)
		expect(next.cards[0].lastBuildId).toBe('b1')
		expect(next.lastBuildReceipt).toEqual({
			cardId: 'c1',
			subtaskTitle: 'Nav bar',
			fileCount: 3,
			tokenCost: 5,
		})
	})

	it('transitions card to failed on failed event with kanbanCardId', () => {
		const c = makeCard({ id: 'c1', state: 'building' })
		const before = seed({ cards: [c] })
		const next = workspaceBuildReducer(before, {
			type: 'failed',
			reason: 'timeout',
			code: 'timeout',
			kanbanCardId: 'c1',
		})
		expect(next.cards[0].state).toBe('failed')
		expect(next.cards[0].blockedReason).toBe('timeout')
	})

	it('does not mutate cards on failed without kanbanCardId', () => {
		const c = makeCard({ id: 'c1', state: 'building' })
		const before = seed({ cards: [c] })
		const next = workspaceBuildReducer(before, {
			type: 'failed',
			reason: 'boom',
			code: 'unknown',
		})
		expect(next.cards).toBe(before.cards)
	})
})
