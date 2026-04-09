import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import { deriveProjectStep } from '../derive-step'

function makeCard(overrides: Partial<KanbanCard> & { parentId: string | null }): KanbanCard {
	return {
		id: crypto.randomUUID(),
		projectId: 'proj-1',
		position: 0,
		state: 'draft',
		required: false,
		title: 'Test card',
		description: null,
		taskType: 'feature',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'template',
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

describe('deriveProjectStep', () => {
	it('returns Planning when no cards exist', () => {
		expect(deriveProjectStep([])).toEqual({ current: 0, total: 1, label: 'Planning' })
	})

	it('ignores milestone cards (parentId === null)', () => {
		const cards = [makeCard({ parentId: null, title: 'Milestone' })]
		expect(deriveProjectStep(cards)).toEqual({ current: 0, total: 1, label: 'Planning' })
	})

	it('returns Complete when all subtasks are built', () => {
		const cards = [
			makeCard({ parentId: 'p1', state: 'built', position: 0 }),
			makeCard({ parentId: 'p1', state: 'built', position: 1 }),
		]
		expect(deriveProjectStep(cards)).toEqual({ current: 2, total: 2, label: 'Complete' })
	})

	it('returns next card title for partial progress', () => {
		const cards = [
			makeCard({ parentId: 'p1', state: 'built', position: 0, title: 'Done task' }),
			makeCard({ parentId: 'p1', state: 'ready', position: 1, title: 'Next task' }),
			makeCard({ parentId: 'p1', state: 'draft', position: 2, title: 'Future task' }),
		]
		const step = deriveProjectStep(cards)
		expect(step).toEqual({ current: 1, total: 3, label: 'Next task' })
	})

	it('picks the lowest-position non-built card', () => {
		const cards = [
			makeCard({ parentId: 'p1', state: 'draft', position: 5, title: 'Later' }),
			makeCard({ parentId: 'p1', state: 'ready', position: 2, title: 'First' }),
			makeCard({ parentId: 'p1', state: 'built', position: 0, title: 'Done' }),
		]
		const step = deriveProjectStep(cards)
		expect(step.label).toBe('First')
	})

	it('truncates long card titles to 30 characters', () => {
		const cards = [
			makeCard({
				parentId: 'p1',
				state: 'draft',
				position: 0,
				title: 'This is a very long card title that exceeds thirty characters',
			}),
		]
		const step = deriveProjectStep(cards)
		expect(step.label).toBe('This is a very long card title')
	})
})
