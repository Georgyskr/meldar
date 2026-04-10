import type { KanbanCardState } from '@/entities/kanban-card'

const VALID_TRANSITIONS: Record<KanbanCardState, readonly KanbanCardState[]> = {
	draft: ['ready', 'building'],
	ready: ['queued', 'building'],
	queued: ['building'],
	building: ['built', 'failed'],
	built: ['building'],
	failed: ['needs_rework', 'ready', 'building'],
	needs_rework: ['ready', 'building'],
}

export function canTransition(from: KanbanCardState, to: KanbanCardState): boolean {
	return VALID_TRANSITIONS[from].includes(to)
}

export function userVisibleLabel(state: KanbanCardState): string {
	switch (state) {
		case 'draft':
			return 'To do'
		case 'ready':
			return 'Ready'
		case 'queued':
		case 'building':
			return 'Building\u2026'
		case 'built':
			return 'Done'
		case 'failed':
			return 'Failed'
		case 'needs_rework':
			return 'Edit'
	}
}
