import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import { cardsToFlow } from '../lib/cards-to-flow'

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

describe('cardsToFlow', () => {
	it('returns empty nodes and edges for empty input', () => {
		const result = cardsToFlow([])
		expect(result.nodes).toEqual([])
		expect(result.edges).toEqual([])
	})

	it('creates milestone nodes from parentId=null cards', () => {
		const m1 = card({ id: 'm1', parentId: null, position: 0, title: 'Milestone 1' })
		const m2 = card({ id: 'm2', parentId: null, position: 1, title: 'Milestone 2' })

		const { nodes, edges } = cardsToFlow([m1, m2])

		const milestoneNodes = nodes.filter((n) => n.type === 'milestone')
		expect(milestoneNodes).toHaveLength(2)
		expect(milestoneNodes[0].id).toBe('m1')
		expect(milestoneNodes[1].id).toBe('m2')

		const seqEdges = edges.filter((e) => e.id.startsWith('seq:'))
		expect(seqEdges).toHaveLength(1)
		expect(seqEdges[0].source).toBe('m1')
		expect(seqEdges[0].target).toBe('m2')
	})

	it('creates subtask nodes with correct type', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1 })

		const { nodes } = cardsToFlow([m, s1, s2])

		const subtaskNodes = nodes.filter((n) => n.type === 'subtask')
		expect(subtaskNodes).toHaveLength(2)
		expect(subtaskNodes[0].id).toBe('s1')
		expect(subtaskNodes[1].id).toBe('s2')
	})

	it('creates edges from dependsOn arrays', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0, dependsOn: [] })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1, dependsOn: ['s1'] })

		const { edges } = cardsToFlow([m, s1, s2])

		const depEdges = edges.filter((e) => e.id.startsWith('dep:'))
		expect(depEdges).toHaveLength(1)
		expect(depEdges[0].source).toBe('s1')
		expect(depEdges[0].target).toBe('s2')
	})

	it('creates animated edges for building state', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1, state: 'building', dependsOn: ['s1'] })

		const { edges } = cardsToFlow([m, s1, s2])

		const depEdge = edges.find((e) => e.id.startsWith('dep:'))
		expect(depEdge?.animated).toBe(true)
	})

	it('creates solid green edges for built state', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1, state: 'built', dependsOn: ['s1'] })

		const { edges } = cardsToFlow([m, s1, s2])

		const depEdge = edges.find((e) => e.id.startsWith('dep:'))
		expect(depEdge?.animated).toBe(false)
		expect(depEdge?.style?.stroke).toBe('#22c55e')
	})

	it('creates dashed edges for not-yet-built dependencies', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1, state: 'draft', dependsOn: ['s1'] })

		const { edges } = cardsToFlow([m, s1, s2])

		const depEdge = edges.find((e) => e.id.startsWith('dep:'))
		expect(depEdge?.animated).toBe(false)
		expect(depEdge?.style?.strokeDasharray).toBe('5 5')
	})

	it('sorts milestones by position', () => {
		const m2 = card({ id: 'm-second', parentId: null, position: 1 })
		const m1 = card({ id: 'm-first', parentId: null, position: 0 })

		const { nodes } = cardsToFlow([m2, m1])

		const milestoneNodes = nodes.filter((n) => n.type === 'milestone')
		expect(milestoneNodes[0].id).toBe('m-first')
		expect(milestoneNodes[1].id).toBe('m-second')
	})

	it('includes milestone state data in node data', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0, state: 'built' })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1, state: 'draft' })

		const { nodes } = cardsToFlow([m, s1, s2])

		const milestoneNode = nodes.find((n) => n.type === 'milestone')
		expect(milestoneNode?.data.subtaskCount).toBe(2)
		expect(milestoneNode?.data.doneCount).toBe(1)
		expect(milestoneNode?.data.milestoneState).toBe('in_progress')
	})

	it('handles multiple dependsOn entries', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })
		const s1 = card({ id: 's1', parentId: 'm1', position: 0 })
		const s2 = card({ id: 's2', parentId: 'm1', position: 1 })
		const s3 = card({ id: 's3', parentId: 'm1', position: 2, dependsOn: ['s1', 's2'] })

		const { edges } = cardsToFlow([m, s1, s2, s3])

		const depEdges = edges.filter((e) => e.id.startsWith('dep:'))
		expect(depEdges).toHaveLength(2)
		expect(depEdges.map((e) => e.source).sort()).toEqual(['s1', 's2'])
	})

	it('does not create sequential edges for a single milestone', () => {
		const m = card({ id: 'm1', parentId: null, position: 0 })

		const { edges } = cardsToFlow([m])

		const seqEdges = edges.filter((e) => e.id.startsWith('seq:'))
		expect(seqEdges).toHaveLength(0)
	})
})
