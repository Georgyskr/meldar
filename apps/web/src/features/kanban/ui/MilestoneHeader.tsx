'use client'

import { Flex, HStack } from '@styled-system/jsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { KanbanCard, MilestoneState } from '@/entities/kanban-card'
import { Text } from '@/shared/ui'
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
			<Text color="onSurfaceVariant" marginBlockStart="2px" flexShrink={0}>
				<ChevronIcon size={16} />
			</Text>

			<Flex direction="column" flex="1" gap={1} minWidth={0}>
				<HStack gap={2} alignItems="center">
					<Text
						textStyle="secondary.md"
						color="onSurface"
						overflow="hidden"
						textOverflow="ellipsis"
						whiteSpace="nowrap"
						flex="1"
					>
						{milestone.title}
					</Text>
					<MilestoneStateBadge state={state} />
				</HStack>

				{milestone.description && (
					<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
						{milestone.description}
					</Text>
				)}

				{totalCount > 0 && (
					<Text textStyle="secondary.xs" color="onSurfaceVariant">
						{doneCount} of {totalCount} done
					</Text>
				)}
			</Flex>
		</Flex>
	)
}
