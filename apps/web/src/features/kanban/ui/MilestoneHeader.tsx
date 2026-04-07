'use client'

import { Flex, HStack, styled } from '@styled-system/jsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { KanbanCard, MilestoneState } from '@/entities/kanban-card'
import { MilestoneStateBadge } from './MilestoneStateBadge'

export type MilestoneHeaderProps = {
	readonly milestone: KanbanCard
	readonly state: MilestoneState
	readonly doneCount: number
	readonly totalCount: number
	readonly expanded: boolean
	readonly onToggle: () => void
}

export function MilestoneHeader({
	milestone,
	state,
	doneCount,
	totalCount,
	expanded,
	onToggle,
}: MilestoneHeaderProps) {
	const ChevronIcon = expanded ? ChevronDown : ChevronRight

	return (
		<Flex
			alignItems="flex-start"
			gap={2}
			paddingBlock={3}
			paddingInline={4}
			cursor="pointer"
			transition="background 0.15s"
			_hover={{ background: 'surfaceContainerLow' }}
			onClick={() => onToggle()}
			role="button"
			tabIndex={0}
			aria-expanded={expanded}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onToggle()
				}
			}}
		>
			<styled.span color="onSurfaceVariant" marginBlockStart="2px" flexShrink={0}>
				<ChevronIcon size={16} />
			</styled.span>

			<Flex direction="column" flex="1" gap={1} minWidth={0}>
				<HStack gap={2} alignItems="center">
					<styled.span
						textStyle="body.md"
						fontWeight="600"
						color="onSurface"
						overflow="hidden"
						textOverflow="ellipsis"
						whiteSpace="nowrap"
						flex="1"
					>
						{milestone.title}
					</styled.span>
					<MilestoneStateBadge state={state} />
				</HStack>

				{milestone.description && (
					<styled.p textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.4">
						{milestone.description}
					</styled.p>
				)}

				{totalCount > 0 && (
					<styled.span textStyle="body.xs" color="onSurfaceVariant">
						{doneCount} of {totalCount} done
					</styled.span>
				)}
			</Flex>
		</Flex>
	)
}
