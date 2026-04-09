'use client'

import { VStack } from '@styled-system/jsx'
import { useMemo } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { Heading } from '@/shared/ui'
import { groupCards } from '../lib/group-cards'
import { deriveMilestoneState } from '../model/derive-milestone-state'
import { AddMilestoneButton } from './AddMilestoneButton'
import { MilestoneRow } from './MilestoneRow'

export type KanbanBoardProps = {
	readonly cards: readonly KanbanCard[]
	readonly onAddMilestone: () => void
	readonly onAddSubtask: (milestoneId: string) => void
}

export function KanbanBoard({ cards, onAddMilestone, onAddSubtask }: KanbanBoardProps) {
	const { milestones, subtasksByMilestone } = useMemo(() => groupCards(cards), [cards])

	const currentMilestoneId = useMemo(() => {
		for (const m of milestones) {
			const subs = subtasksByMilestone.get(m.id) ?? []
			const state = deriveMilestoneState(subs)
			if (state !== 'complete') return m.id
		}
		return milestones[milestones.length - 1]?.id ?? null
	}, [milestones, subtasksByMilestone])

	return (
		<VStack alignItems="stretch" gap={2} padding={3}>
			<Heading textStyle="secondary.xs" color="onSurfaceVariant" paddingInline={1}>
				Your build plan
			</Heading>

			{milestones.map((milestone) => (
				<MilestoneRow
					key={milestone.id}
					milestone={milestone}
					subtasks={[...(subtasksByMilestone.get(milestone.id) ?? [])]}
					isCurrentMilestone={milestone.id === currentMilestoneId}
					onAddSubtask={onAddSubtask}
				/>
			))}

			<AddMilestoneButton onAdd={onAddMilestone} />
		</VStack>
	)
}
