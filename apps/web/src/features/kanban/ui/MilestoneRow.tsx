'use client'

import { Box, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import type { KanbanCard, MilestoneState } from '@/entities/kanban-card'
import { deriveMilestoneState } from '../model/derive-milestone-state'
import { expandedMilestonesAtom } from '../model/kanban-atoms'
import { AddSubtaskButton } from './AddSubtaskButton'
import { InlineExplainer } from './InlineExplainer'
import { MilestoneHeader } from './MilestoneHeader'
import { SubtaskRow } from './SubtaskRow'

const MILESTONE_BORDER_COLORS: Record<MilestoneState, string> = {
	not_started: 'outlineVariant/30',
	in_progress: 'primary',
	complete: 'green.500',
	needs_attention: 'amber.500',
}

export type MilestoneRowProps = {
	readonly milestone: KanbanCard
	readonly subtasks: readonly KanbanCard[]
	readonly isCurrentMilestone: boolean
	readonly onAddSubtask: (milestoneId: string) => void
}

export function MilestoneRow({
	milestone,
	subtasks,
	isCurrentMilestone,
	onAddSubtask,
}: MilestoneRowProps) {
	const [expandedSet, setExpandedSet] = useAtom(expandedMilestonesAtom)
	const state = deriveMilestoneState(subtasks)

	const isExpanded =
		expandedSet.has(milestone.id) ||
		(isCurrentMilestone && !expandedSet.has(`collapsed:${milestone.id}`))

	const toggleExpand = () => {
		setExpandedSet((prev: ReadonlySet<string>) => {
			const next = new Set(prev)
			if (isExpanded) {
				next.delete(milestone.id)
				if (isCurrentMilestone) next.add(`collapsed:${milestone.id}`)
			} else {
				next.add(milestone.id)
				next.delete(`collapsed:${milestone.id}`)
			}
			return next
		})
	}

	const doneCount = subtasks.filter((s) => s.state === 'built').length

	return (
		<Box
			borderRadius="lg"
			border="1px solid"
			borderColor="outlineVariant/20"
			borderInlineStart="4px solid"
			borderInlineStartColor={MILESTONE_BORDER_COLORS[state]}
			background="surface"
			overflow="hidden"
		>
			<MilestoneHeader
				milestone={milestone}
				state={state}
				doneCount={doneCount}
				totalCount={subtasks.length}
				expanded={isExpanded}
				onToggle={toggleExpand}
			/>

			{isExpanded && (
				<VStack alignItems="stretch" gap={0} paddingBlockEnd={2}>
					{milestone.explainerText && (
						<Box paddingInline={4} paddingBlockEnd={2}>
							<InlineExplainer cardId={milestone.id} text={milestone.explainerText} />
						</Box>
					)}

					{subtasks.map((subtask) => (
						<SubtaskRow key={subtask.id} subtask={subtask} />
					))}

					<Box paddingBlockStart={1}>
						<AddSubtaskButton onAdd={() => onAddSubtask(milestone.id)} />
					</Box>
				</VStack>
			)}
		</Box>
	)
}
