import type { KanbanCard, KanbanCardState, MilestoneState } from '@/entities/kanban-card'
import type { GalaxyMilestone, GalaxyTask, GalaxyTaskStatus } from './types'

function mapCardState(state: KanbanCardState): GalaxyTaskStatus {
	switch (state) {
		case 'built':
			return 'done'
		case 'ready':
			return 'ready'
		case 'queued':
		case 'building':
			return 'active'
		case 'draft':
			return 'todo'
		case 'failed':
		case 'needs_rework':
			return 'failed'
	}
}

function mapMilestoneState(state: MilestoneState): 'done' | 'active' | 'locked' {
	switch (state) {
		case 'complete':
			return 'done'
		case 'in_progress':
		case 'needs_attention':
			return 'active'
		case 'not_started':
			return 'locked'
	}
}

type GroupedCards = {
	readonly milestones: readonly KanbanCard[]
	readonly subtasksByMilestone: ReadonlyMap<string, readonly KanbanCard[]>
}

function groupCards(cards: readonly KanbanCard[]): GroupedCards {
	const milestones: KanbanCard[] = []
	const subtasksByMilestone = new Map<string, KanbanCard[]>()

	for (const card of cards) {
		if (card.parentId === null) {
			milestones.push(card)
		} else {
			const existing = subtasksByMilestone.get(card.parentId)
			if (existing) {
				existing.push(card)
			} else {
				subtasksByMilestone.set(card.parentId, [card])
			}
		}
	}

	milestones.sort((a, b) => a.position - b.position)
	for (const [, subtasks] of subtasksByMilestone) {
		subtasks.sort((a, b) => a.position - b.position)
	}

	return { milestones, subtasksByMilestone }
}

export function kanbanToGalaxy(cards: readonly KanbanCard[]): GalaxyMilestone[] {
	const groups = groupCards(cards)

	return groups.milestones.map((milestone) => {
		const subtasks = groups.subtasksByMilestone.get(milestone.id) ?? []
		const doneCount = subtasks.filter((c) => c.state === 'built').length
		const completionPct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0

		const tasks: GalaxyTask[] = subtasks.map((card) => ({
			id: card.id,
			title: card.title,
			status: mapCardState(card.state),
			learn: card.explainerText ?? card.description ?? '',
			dependsOn: card.dependsOn,
		}))

		const milestoneState: MilestoneState =
			doneCount === subtasks.length && subtasks.length > 0
				? 'complete'
				: doneCount > 0
					? 'in_progress'
					: 'not_started'

		return {
			id: milestone.id,
			title: milestone.title,
			status: mapMilestoneState(milestoneState),
			completionPct,
			tasks,
		}
	})
}
