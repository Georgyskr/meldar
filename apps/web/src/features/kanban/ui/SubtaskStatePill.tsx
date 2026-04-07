'use client'

import { styled } from '@styled-system/jsx'
import type { KanbanCardState } from '@/entities/kanban-card'
import { userVisibleLabel } from '../model/card-state-machine'

const STATE_COLORS: Record<KanbanCardState, { bg: string; color: string }> = {
	draft: { bg: 'surfaceContainerHigh', color: 'onSurfaceVariant' },
	ready: { bg: 'primary/10', color: 'primary' },
	queued: { bg: 'primary/10', color: 'primary' },
	building: { bg: 'primary/15', color: 'primary' },
	built: { bg: 'green.50', color: 'green.700' },
	failed: { bg: 'red.50', color: 'red.700' },
	needs_rework: { bg: 'amber.50', color: 'amber.700' },
}

export type SubtaskStatePillProps = {
	readonly state: KanbanCardState
}

export function SubtaskStatePill({ state }: SubtaskStatePillProps) {
	const colors = STATE_COLORS[state]
	return (
		<styled.span
			textStyle="body.xs"
			fontWeight="500"
			paddingInline={2}
			paddingBlock="1px"
			borderRadius="sm"
			background={colors.bg}
			color={colors.color}
			whiteSpace="nowrap"
			flexShrink={0}
		>
			{userVisibleLabel(state)}
		</styled.span>
	)
}
