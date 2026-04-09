'use client'

import { styled } from '@styled-system/jsx'
import { Zap } from 'lucide-react'
import type { KanbanCard } from '@/entities/kanban-card'

export type BuildButtonProps = {
	readonly cards: readonly KanbanCard[]
	readonly onBuild: (readySubtasks: readonly KanbanCard[]) => void
	readonly disabled?: boolean
}

export function BuildButton({ cards, onBuild, disabled = false }: BuildButtonProps) {
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
		<styled.button
			type="button"
			onClick={() => canBuild && onBuild(readySubtasks)}
			disabled={!canBuild}
			display="flex"
			alignItems="center"
			gap={2}
			paddingBlock={2}
			paddingInline={4}
			borderRadius="md"
			background="primary"
			color="onPrimary"
			fontWeight="600"
			textStyle="secondary.sm"
			cursor={canBuild ? 'pointer' : 'not-allowed'}
			transition="opacity 0.15s"
			_hover={{ opacity: canBuild ? 0.9 : 1 }}
			_disabled={{
				opacity: 0.4,
				cursor: 'not-allowed',
			}}
		>
			<Zap size={14} />
			{label}
		</styled.button>
	)
}
