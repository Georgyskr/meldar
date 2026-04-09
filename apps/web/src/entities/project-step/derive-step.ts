import type { KanbanCard } from '@/entities/kanban-card'
import type { ProjectStep } from './types'

export function deriveProjectStep(cards: readonly KanbanCard[]): ProjectStep {
	const subtasks = cards.filter((c) => c.parentId !== null)
	const built = subtasks.filter((c) => c.state === 'built').length
	const total = subtasks.length

	if (total === 0) return { current: 0, total: 1, label: 'Planning' }
	if (built === total) return { current: total, total, label: 'Complete' }

	const nextCard = subtasks
		.filter((c) => c.state !== 'built')
		.sort((a, b) => a.position - b.position)[0]

	return {
		current: built,
		total,
		label: nextCard?.title.slice(0, 30) ?? 'Next step',
	}
}
