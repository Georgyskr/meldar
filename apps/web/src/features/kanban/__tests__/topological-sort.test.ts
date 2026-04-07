import { describe, expect, it } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import { topologicalSort } from '../lib/topological-sort'

function card(id: string, dependsOn: string[] = []): KanbanCard {
	return {
		id,
		projectId: 'proj-1',
		parentId: 'milestone-1',
		position: 0,
		state: 'ready',
		required: false,
		title: `Task ${id}`,
		description: null,
		taskType: 'feature',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'user',
		tokenCostEstimateMin: null,
		tokenCostEstimateMax: null,
		tokenCostActual: null,
		dependsOn,
		blockedReason: null,
		lastBuildId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		builtAt: null,
	}
}

describe('topologicalSort', () => {
	it('returns an empty sorted array for empty input', () => {
		const result = topologicalSort([])
		expect(result).toEqual({ ok: true, sorted: [] })
	})

	it('preserves a single subtask', () => {
		const subtasks = [card('a')]
		const result = topologicalSort(subtasks)
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.sorted).toHaveLength(1)
			expect(result.sorted[0].id).toBe('a')
		}
	})

	it('sorts subtasks with linear dependencies', () => {
		const subtasks = [card('c', ['b']), card('b', ['a']), card('a')]
		const result = topologicalSort(subtasks)
		expect(result.ok).toBe(true)
		if (result.ok) {
			const ids = result.sorted.map((s) => s.id)
			expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
			expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'))
		}
	})

	it('handles diamond dependencies', () => {
		const subtasks = [card('d', ['b', 'c']), card('c', ['a']), card('b', ['a']), card('a')]
		const result = topologicalSort(subtasks)
		expect(result.ok).toBe(true)
		if (result.ok) {
			const ids = result.sorted.map((s) => s.id)
			expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
			expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'))
			expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'))
			expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'))
		}
	})

	it('detects a simple cycle', () => {
		const subtasks = [card('a', ['b']), card('b', ['a'])]
		const result = topologicalSort(subtasks)
		expect(result).toEqual({ ok: false, error: 'cycle_detected' })
	})

	it('detects a 3-node cycle', () => {
		const subtasks = [card('a', ['c']), card('b', ['a']), card('c', ['b'])]
		const result = topologicalSort(subtasks)
		expect(result).toEqual({ ok: false, error: 'cycle_detected' })
	})

	it('handles subtasks with no dependencies in any order', () => {
		const subtasks = [card('x'), card('y'), card('z')]
		const result = topologicalSort(subtasks)
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.sorted).toHaveLength(3)
		}
	})

	it('ignores dependencies referencing cards outside the input set', () => {
		const subtasks = [card('a', ['external-card']), card('b', ['a'])]
		const result = topologicalSort(subtasks)
		expect(result.ok).toBe(true)
		if (result.ok) {
			const ids = result.sorted.map((s) => s.id)
			expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
		}
	})
})
