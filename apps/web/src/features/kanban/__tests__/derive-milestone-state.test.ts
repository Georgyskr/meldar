import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import { deriveMilestoneState } from '../model/derive-milestone-state'

function card(overrides: Partial<KanbanCard> = {}): KanbanCard {
	return {
		id: 'card-1',
		projectId: 'proj-1',
		parentId: 'milestone-1',
		position: 0,
		state: 'draft',
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

describe('deriveMilestoneState', () => {
	it('returns not_started for an empty subtask array', () => {
		expect(deriveMilestoneState([])).toBe('not_started')
	})

	it('returns not_started when all subtasks are draft', () => {
		const subtasks = [card({ id: 'a', state: 'draft' }), card({ id: 'b', state: 'draft' })]
		expect(deriveMilestoneState(subtasks)).toBe('not_started')
	})

	it('returns complete when all subtasks are built', () => {
		const subtasks = [
			card({ id: 'a', state: 'built' }),
			card({ id: 'b', state: 'built' }),
			card({ id: 'c', state: 'built' }),
		]
		expect(deriveMilestoneState(subtasks)).toBe('complete')
	})

	it('returns needs_attention when any subtask has failed', () => {
		const subtasks = [card({ id: 'a', state: 'built' }), card({ id: 'b', state: 'failed' })]
		expect(deriveMilestoneState(subtasks)).toBe('needs_attention')
	})

	it('returns needs_attention when any subtask needs rework', () => {
		const subtasks = [card({ id: 'a', state: 'built' }), card({ id: 'b', state: 'needs_rework' })]
		expect(deriveMilestoneState(subtasks)).toBe('needs_attention')
	})

	it('returns in_progress when a subtask is queued', () => {
		const subtasks = [card({ id: 'a', state: 'draft' }), card({ id: 'b', state: 'queued' })]
		expect(deriveMilestoneState(subtasks)).toBe('in_progress')
	})

	it('returns in_progress when a subtask is building', () => {
		const subtasks = [card({ id: 'a', state: 'draft' }), card({ id: 'b', state: 'building' })]
		expect(deriveMilestoneState(subtasks)).toBe('in_progress')
	})

	it('returns in_progress when subtasks have mixed draft and ready states', () => {
		const subtasks = [card({ id: 'a', state: 'draft' }), card({ id: 'b', state: 'ready' })]
		expect(deriveMilestoneState(subtasks)).toBe('in_progress')
	})

	it('returns in_progress when some subtasks are built and some are draft', () => {
		const subtasks = [card({ id: 'a', state: 'built' }), card({ id: 'b', state: 'draft' })]
		expect(deriveMilestoneState(subtasks)).toBe('in_progress')
	})

	it('prioritizes needs_attention over in_progress when both failed and building exist', () => {
		const subtasks = [card({ id: 'a', state: 'building' }), card({ id: 'b', state: 'failed' })]
		expect(deriveMilestoneState(subtasks)).toBe('needs_attention')
	})
})
