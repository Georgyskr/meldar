'use client'

import { Box, Flex, HStack, styled } from '@styled-system/jsx'
import { useSetAtom } from 'jotai'
import type { KanbanCard } from '@/entities/kanban-card'
import { editingCardIdAtom } from '../model/kanban-atoms'
import { InlineExplainer } from './InlineExplainer'
import { SubtaskCostBadge } from './SubtaskCostBadge'
import { SubtaskStatePill } from './SubtaskStatePill'

const SUBTASK_BORDER_COLORS: Record<string, string> = {
	draft: 'outlineVariant/30',
	ready: 'primary/40',
	queued: 'primary/40',
	building: 'primary/60',
	built: 'green.400',
	failed: 'red.400',
	needs_rework: 'amber.400',
}

export type SubtaskRowProps = {
	readonly subtask: KanbanCard
}

export function SubtaskRow({ subtask }: SubtaskRowProps) {
	const setEditingCardId = useSetAtom(editingCardIdAtom)
	const borderColor = SUBTASK_BORDER_COLORS[subtask.state] ?? 'outlineVariant/30'

	return (
		<Box
			paddingInlineStart={8}
			paddingInlineEnd={3}
			paddingBlock={2}
			borderInlineStart="2px solid"
			borderColor={borderColor}
			cursor="pointer"
			transition="background 0.15s"
			_hover={{ background: 'surfaceContainerLow' }}
			onClick={() => setEditingCardId(subtask.id)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					setEditingCardId(subtask.id)
				}
			}}
		>
			<Flex alignItems="center" gap={2}>
				<styled.span
					flex="1"
					textStyle="body.sm"
					color="onSurface"
					overflow="hidden"
					textOverflow="ellipsis"
					whiteSpace="nowrap"
				>
					{subtask.title}
				</styled.span>
				<HStack gap={2} flexShrink={0}>
					<SubtaskCostBadge min={subtask.tokenCostEstimateMin} max={subtask.tokenCostEstimateMax} />
					<SubtaskStatePill state={subtask.state} />
				</HStack>
			</Flex>

			{subtask.explainerText && (
				<InlineExplainer cardId={subtask.id} text={subtask.explainerText} />
			)}
		</Box>
	)
}
