import type { KanbanCard, MilestoneState } from '@/entities/kanban-card'

export function deriveMilestoneState(subtasks: readonly KanbanCard[]): MilestoneState {
	if (subtasks.length === 0) return 'not_started'

	const hasBuilding = subtasks.some((s) => s.state === 'queued' || s.state === 'building')
	const hasFailed = subtasks.some((s) => s.state === 'failed' || s.state === 'needs_rework')
	const allBuilt = subtasks.every((s) => s.state === 'built')
	const allDraft = subtasks.every((s) => s.state === 'draft')

	if (allBuilt) return 'complete'
	if (hasFailed) return 'needs_attention'
	if (hasBuilding || !allDraft) return 'in_progress'
	return 'not_started'
}
