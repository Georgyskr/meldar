'use client'

import { styled } from '@styled-system/jsx'
import type { MilestoneState } from '@/entities/kanban-card'

const STATE_CONFIG: Record<MilestoneState, { label: string; bg: string; color: string }> = {
	not_started: { label: 'Not started', bg: 'surfaceContainerHigh', color: 'onSurfaceVariant' },
	in_progress: { label: 'In progress', bg: 'primary/10', color: 'primary' },
	complete: { label: 'Complete', bg: 'green.50', color: 'green.700' },
	needs_attention: { label: 'Needs attention', bg: 'amber.50', color: 'amber.700' },
}

export type MilestoneStateBadgeProps = {
	readonly state: MilestoneState
}

export function MilestoneStateBadge({ state }: MilestoneStateBadgeProps) {
	const config = STATE_CONFIG[state]
	return (
		<styled.span
			textStyle="body.xs"
			fontWeight="500"
			paddingInline={2}
			paddingBlock="2px"
			borderRadius="full"
			background={config.bg}
			color={config.color}
			whiteSpace="nowrap"
		>
			{config.label}
		</styled.span>
	)
}
