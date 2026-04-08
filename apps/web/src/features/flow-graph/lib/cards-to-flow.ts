import type { Edge, Node } from '@xyflow/react'
import type { KanbanCard, MilestoneState } from '@/entities/kanban-card'
import { deriveMilestoneState } from '@/features/kanban'

export type MilestoneNodeData = {
	card: KanbanCard
	subtaskCount: number
	doneCount: number
	milestoneState: MilestoneState
}

export type SubtaskNodeData = {
	card: KanbanCard
}

export type MilestoneNodeType = Node<MilestoneNodeData, 'milestone'>
export type SubtaskNodeType = Node<SubtaskNodeData, 'subtask'>

function edgeStyle(card: KanbanCard): {
	animated: boolean
	strokeDasharray?: string
	stroke: string
} {
	if (card.state === 'building' || card.state === 'queued') {
		return { animated: true, stroke: '#623153' }
	}
	if (card.state === 'built') {
		return { animated: false, stroke: '#22c55e' }
	}
	return { animated: false, strokeDasharray: '5 5', stroke: '#94a3b8' }
}

export function cardsToFlow(cards: readonly KanbanCard[]): {
	nodes: Node[]
	edges: Edge[]
} {
	const milestones: KanbanCard[] = []
	const subtasksByParent = new Map<string, KanbanCard[]>()

	for (const card of cards) {
		if (card.parentId === null) {
			milestones.push(card)
		} else {
			const list = subtasksByParent.get(card.parentId) ?? []
			list.push(card)
			subtasksByParent.set(card.parentId, list)
		}
	}

	milestones.sort((a, b) => a.position - b.position)
	for (const [, subs] of subtasksByParent) {
		subs.sort((a, b) => a.position - b.position)
	}

	const nodes: Node[] = []
	const edges: Edge[] = []

	for (const milestone of milestones) {
		const subs = subtasksByParent.get(milestone.id) ?? []
		const doneCount = subs.filter((s) => s.state === 'built').length
		const milestoneState = deriveMilestoneState(subs)

		nodes.push({
			id: milestone.id,
			type: 'milestone',
			data: {
				card: milestone,
				subtaskCount: subs.length,
				doneCount,
				milestoneState,
			} satisfies MilestoneNodeData,
			position: { x: 0, y: 0 },
		})

		for (const subtask of subs) {
			nodes.push({
				id: subtask.id,
				type: 'subtask',
				data: { card: subtask } satisfies SubtaskNodeData,
				position: { x: 0, y: 0 },
			})
		}

		for (const card of [milestone, ...subs]) {
			for (const depId of card.dependsOn) {
				const style = edgeStyle(card)
				edges.push({
					id: `dep:${depId}->${card.id}`,
					source: depId,
					target: card.id,
					animated: style.animated,
					style: {
						stroke: style.stroke,
						...(style.strokeDasharray ? { strokeDasharray: style.strokeDasharray } : {}),
					},
					type: 'smoothstep',
				})
			}
		}
	}

	for (let i = 1; i < milestones.length; i++) {
		edges.push({
			id: `seq:${milestones[i - 1].id}->${milestones[i].id}`,
			source: milestones[i - 1].id,
			target: milestones[i].id,
			type: 'smoothstep',
			style: { stroke: '#94a3b8', strokeWidth: 1.5 },
		})
	}

	return { nodes, edges }
}
