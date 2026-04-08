import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'

const MILESTONE_WIDTH = 280
const MILESTONE_HEIGHT = 120
const SUBTASK_WIDTH = 240
const SUBTASK_HEIGHT = 72

export function layoutFlow(nodes: Node[], edges: Edge[]): Node[] {
	const g = new dagre.graphlib.Graph()
	g.setDefaultEdgeLabel(() => ({}))
	g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120, marginx: 40, marginy: 40 })

	for (const node of nodes) {
		const isMilestone = node.type === 'milestone'
		g.setNode(node.id, {
			width: isMilestone ? MILESTONE_WIDTH : SUBTASK_WIDTH,
			height: isMilestone ? MILESTONE_HEIGHT : SUBTASK_HEIGHT,
		})
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target)
	}

	dagre.layout(g)

	return nodes.map((node) => {
		const pos = g.node(node.id)
		if (!pos) return node
		const width = node.type === 'milestone' ? MILESTONE_WIDTH : SUBTASK_WIDTH
		const height = node.type === 'milestone' ? MILESTONE_HEIGHT : SUBTASK_HEIGHT
		return {
			...node,
			position: {
				x: pos.x - width / 2,
				y: pos.y - height / 2,
			},
		}
	})
}
