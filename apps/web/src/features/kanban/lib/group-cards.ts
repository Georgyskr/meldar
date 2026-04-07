import type { KanbanCard } from '@/entities/kanban-card'

export type GroupedCards = {
	readonly milestones: readonly KanbanCard[]
	readonly subtasksByMilestone: ReadonlyMap<string, readonly KanbanCard[]>
}

export function groupCards(cards: readonly KanbanCard[]): GroupedCards {
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
