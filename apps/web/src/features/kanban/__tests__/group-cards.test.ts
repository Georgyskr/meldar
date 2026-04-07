import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import { groupCards } from '../lib/group-cards'

function card(overrides: Partial<KanbanCard> = {}): KanbanCard {
	return {
		id: 'card-1',
		projectId: 'proj-1',
		parentId: null,
		position: 0,
		state: 'draft',
		required: false,
		title: 'Test',
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

describe('groupCards', () => {
	it('returns empty milestones and empty map for empty input', () => {
		const result = groupCards([])
		expect(result.milestones).toEqual([])
		expect(result.subtasksByMilestone.size).toBe(0)
	})

	it('separates milestones from subtasks', () => {
		const m1 = card({ id: 'm1', parentId: null, position: 0 })
		const m2 = card({ id: 'm2', parentId: null, position: 1 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1 })
		const s3 = card({ id: 's3', parentId: 'm2', position: 0 })

		const result = groupCards([m1, s1, m2, s2, s3])

		expect(result.milestones).toHaveLength(2)
		expect(result.milestones[0].id).toBe('m1')
		expect(result.milestones[1].id).toBe('m2')

		expect(result.subtasksByMilestone.get('m1')).toHaveLength(2)
		expect(result.subtasksByMilestone.get('m2')).toHaveLength(1)
	})

	it('sorts milestones by position', () => {
		const m1 = card({ id: 'm-third', parentId: null, position: 2 })
		const m2 = card({ id: 'm-first', parentId: null, position: 0 })
		const m3 = card({ id: 'm-second', parentId: null, position: 1 })

		const result = groupCards([m1, m2, m3])

		expect(result.milestones.map((m) => m.id)).toEqual(['m-first', 'm-second', 'm-third'])
	})

	it('sorts subtasks within a milestone by position', () => {
		const m = card({ id: 'milestone', parentId: null, position: 0 })
		const s1 = card({ id: 's-last', parentId: 'milestone', position: 2 })
		const s2 = card({ id: 's-first', parentId: 'milestone', position: 0 })
		const s3 = card({ id: 's-mid', parentId: 'milestone', position: 1 })

		const result = groupCards([m, s1, s2, s3])

		const subtasks = result.subtasksByMilestone.get('milestone') ?? []
		expect(subtasks.map((s) => s.id)).toEqual(['s-first', 's-mid', 's-last'])
	})

	it('handles milestones with no subtasks', () => {
		const m = card({ id: 'solo', parentId: null, position: 0 })

		const result = groupCards([m])

		expect(result.milestones).toHaveLength(1)
		expect(result.subtasksByMilestone.has('solo')).toBe(false)
	})

	it('handles subtasks whose milestone is missing from the card array', () => {
		const orphan = card({ id: 'orphan', parentId: 'missing-parent', position: 0 })

		const result = groupCards([orphan])

		expect(result.milestones).toHaveLength(0)
		expect(result.subtasksByMilestone.get('missing-parent')).toHaveLength(1)
	})
})
