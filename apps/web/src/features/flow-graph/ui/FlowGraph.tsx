'use client'

import {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	type NodeMouseHandler,
	ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useSetAtom } from 'jotai'
import { useCallback, useMemo } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { editingCardIdAtom } from '@/features/kanban'
import { cardsToFlow } from '../lib/cards-to-flow'
import { layoutFlow } from '../lib/layout'
import { FlowBuildButton } from './FlowBuildButton'
import { MilestoneNode } from './MilestoneNode'
import { SubtaskNode } from './SubtaskNode'

const nodeTypes = {
	milestone: MilestoneNode,
	subtask: SubtaskNode,
} as const

export type FlowGraphProps = {
	readonly cards: readonly KanbanCard[]
	readonly onBuild: (readySubtasks: readonly KanbanCard[]) => void
	readonly buildDisabled?: boolean
}

export function FlowGraph({ cards, onBuild, buildDisabled = false }: FlowGraphProps) {
	const setEditingCardId = useSetAtom(editingCardIdAtom)

	const { nodes, edges } = useMemo(() => {
		const raw = cardsToFlow(cards)
		return { nodes: layoutFlow(raw.nodes, raw.edges), edges: raw.edges }
	}, [cards])

	const handleNodeClick: NodeMouseHandler = useCallback(
		(_event, node) => {
			setEditingCardId(node.id)
		},
		[setEditingCardId],
	)

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			nodeTypes={nodeTypes}
			onNodeClick={handleNodeClick}
			fitView
			fitViewOptions={{ padding: 0.2 }}
			proOptions={{ hideAttribution: true }}
			minZoom={0.3}
			maxZoom={2}
			nodesDraggable={false}
			nodesConnectable={false}
			edgesFocusable={false}
		>
			<Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
			<Controls showInteractive={false} />
			<MiniMap
				nodeColor={(node) => {
					if (node.type === 'milestone') return '#623153'
					return '#c084a8'
				}}
				maskColor="rgba(250, 249, 246, 0.8)"
				style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
			/>
			<FlowBuildButton cards={cards} onBuild={onBuild} disabled={buildDisabled} />
		</ReactFlow>
	)
}
