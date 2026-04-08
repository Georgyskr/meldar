'use client'

import { styled } from '@styled-system/jsx'
import { Panel } from '@xyflow/react'
import { Zap } from 'lucide-react'
import type { KanbanCard } from '@/entities/kanban-card'

export type FlowBuildButtonProps = {
	readonly cards: readonly KanbanCard[]
	readonly onBuild: (readySubtasks: readonly KanbanCard[]) => void
	readonly disabled?: boolean
}

export function FlowBuildButton({ cards, onBuild, disabled = false }: FlowBuildButtonProps) {
	const readySubtasks = cards.filter((c) => c.parentId !== null && c.state === 'ready')
	const isBuilding = cards.some((c) => c.state === 'queued' || c.state === 'building')

	const estimatedCost = readySubtasks.reduce((sum, c) => {
		const avg = ((c.tokenCostEstimateMin ?? 0) + (c.tokenCostEstimateMax ?? 0)) / 2
		return sum + (avg || 3)
	}, 0)

	const canBuild = readySubtasks.length > 0 && !isBuilding && !disabled

	const label = isBuilding
		? 'Building\u2026'
		: readySubtasks.length === 0
			? 'Build'
			: `Build (${Math.round(estimatedCost)} tokens)`

	return (
		<Panel position="bottom-right">
			<styled.button
				type="button"
				onClick={() => canBuild && onBuild(readySubtasks)}
				disabled={!canBuild}
				display="flex"
				alignItems="center"
				gap={2}
				paddingBlock="10px"
				paddingInline="20px"
				borderRadius="xl"
				background="#623153"
				color="white"
				fontWeight="700"
				fontSize="13px"
				cursor={canBuild ? 'pointer' : 'not-allowed'}
				transition="all 0.2s"
				boxShadow="0 4px 14px rgba(98, 49, 83, 0.35)"
				border="none"
				_hover={{
					opacity: canBuild ? 0.9 : 1,
					boxShadow: canBuild ? '0 6px 20px rgba(98, 49, 83, 0.45)' : undefined,
					transform: canBuild ? 'translateY(-1px)' : undefined,
				}}
				_disabled={{
					opacity: 0.4,
					cursor: 'not-allowed',
				}}
			>
				<Zap size={14} />
				{label}
			</styled.button>
		</Panel>
	)
}
