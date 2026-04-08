import type { Edge, Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { layoutFlow } from '../lib/layout'

function node(id: string, type: 'milestone' | 'subtask'): Node {
	return {
		id,
		type,
		data: {},
		position: { x: 0, y: 0 },
	}
}

function edge(source: string, target: string): Edge {
	return { id: `${source}->${target}`, source, target }
}

describe('layoutFlow', () => {
	it('returns nodes with non-zero positions', () => {
		const nodes = [node('m1', 'milestone'), node('m2', 'milestone')]
		const edges = [edge('m1', 'm2')]

		const result = layoutFlow(nodes, edges)

		expect(result).toHaveLength(2)
		const allAtOrigin = result.every((n) => n.position.x === 0 && n.position.y === 0)
		expect(allAtOrigin).toBe(false)
	})

	it('positions source node to the left of target node (LR layout)', () => {
		const nodes = [node('m1', 'milestone'), node('m2', 'milestone')]
		const edges = [edge('m1', 'm2')]

		const result = layoutFlow(nodes, edges)

		const m1 = result.find((n) => n.id === 'm1')
		const m2 = result.find((n) => n.id === 'm2')
		expect(m1).toBeDefined()
		expect(m2).toBeDefined()
		expect(m1?.position.x).toBeLessThan(m2?.position.x ?? 0)
	})

	it('preserves node count', () => {
		const nodes = [
			node('m1', 'milestone'),
			node('s1', 'subtask'),
			node('s2', 'subtask'),
			node('m2', 'milestone'),
		]
		const edges = [edge('m1', 'm2'), edge('s1', 's2')]

		const result = layoutFlow(nodes, edges)
		expect(result).toHaveLength(4)
	})

	it('handles disconnected nodes', () => {
		const nodes = [node('a', 'milestone'), node('b', 'milestone')]
		const edges: Edge[] = []

		const result = layoutFlow(nodes, edges)
		expect(result).toHaveLength(2)
		expect(result[0].position).toBeDefined()
		expect(result[1].position).toBeDefined()
	})

	it('handles a single node', () => {
		const nodes = [node('solo', 'milestone')]
		const result = layoutFlow(nodes, [])

		expect(result).toHaveLength(1)
		expect(result[0].position).toBeDefined()
	})

	it('preserves node type and data', () => {
		const nodes = [
			{ id: 'x', type: 'milestone' as const, data: { foo: 'bar' }, position: { x: 0, y: 0 } },
		]

		const result = layoutFlow(nodes, [])

		expect(result[0].type).toBe('milestone')
		expect(result[0].data).toEqual({ foo: 'bar' })
	})

	it('positions three chained nodes in left-to-right order', () => {
		const nodes = [node('a', 'milestone'), node('b', 'subtask'), node('c', 'subtask')]
		const edges = [edge('a', 'b'), edge('b', 'c')]

		const result = layoutFlow(nodes, edges)

		const positions = result.map((n) => ({ id: n.id, x: n.position.x }))
		positions.sort((a, b) => a.x - b.x)

		expect(positions[0].id).toBe('a')
		expect(positions[1].id).toBe('b')
		expect(positions[2].id).toBe('c')
	})
})
