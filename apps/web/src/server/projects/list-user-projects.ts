import { getDb } from '@meldar/db/client'
import { sql } from 'drizzle-orm'

export type WorkspaceProjectListItem = {
	id: string
	name: string
	lastBuildAt: Date | null
	previewUrl: string | null
	createdAt: Date
	totalSubtasks: number
	builtSubtasks: number
	failedSubtasks: number
	nextCardTitle: string | null
	totalMilestones: number
	completedMilestones: number
}

type Row = {
	id: string
	name: string
	last_build_at: Date | string | null
	preview_url: string | null
	created_at: Date | string
	total_subtasks: number | string
	built_subtasks: number | string
	failed_subtasks: number | string
	next_card_title: string | null
	total_milestones: number | string
	completed_milestones: number | string
}

export async function listUserProjects(userId: string): Promise<WorkspaceProjectListItem[]> {
	const db = getDb()

	const result = await db.execute(sql`
		SELECT
			p.id,
			p.name,
			p.last_build_at,
			p.preview_url,
			p.created_at,
			COALESCE(cs.total_subtasks, 0) AS total_subtasks,
			COALESCE(cs.built_subtasks, 0) AS built_subtasks,
			COALESCE(cs.failed_subtasks, 0) AS failed_subtasks,
			COALESCE(cs.total_milestones, 0) AS total_milestones,
			COALESCE(cm.completed_milestones, 0) AS completed_milestones,
			nc.title AS next_card_title
		FROM projects p
		LEFT JOIN LATERAL (
			SELECT
				count(*) FILTER (WHERE parent_id IS NOT NULL) AS total_subtasks,
				count(*) FILTER (WHERE parent_id IS NOT NULL AND state = 'built') AS built_subtasks,
				count(*) FILTER (WHERE parent_id IS NOT NULL AND state IN ('failed', 'needs_rework')) AS failed_subtasks,
				count(*) FILTER (WHERE parent_id IS NULL) AS total_milestones
			FROM kanban_cards
			WHERE project_id = p.id
		) cs ON true
		LEFT JOIN LATERAL (
			SELECT count(*) AS completed_milestones
			FROM kanban_cards m
			WHERE m.project_id = p.id
				AND m.parent_id IS NULL
				AND EXISTS (
					SELECT 1 FROM kanban_cards child
					WHERE child.parent_id = m.id
				)
				AND NOT EXISTS (
					SELECT 1 FROM kanban_cards child
					WHERE child.parent_id = m.id
						AND child.state <> 'built'
				)
		) cm ON true
		LEFT JOIN LATERAL (
			SELECT title
			FROM kanban_cards
			WHERE project_id = p.id
				AND parent_id IS NOT NULL
				AND state IN ('draft', 'ready')
			ORDER BY position
			LIMIT 1
		) nc ON true
		WHERE p.user_id = ${userId} AND p.deleted_at IS NULL
		ORDER BY p.last_build_at DESC NULLS LAST, p.created_at DESC
	`)

	return (result.rows as Row[]).map((row) => ({
		id: row.id,
		name: row.name,
		lastBuildAt: row.last_build_at ? new Date(row.last_build_at) : null,
		previewUrl: row.preview_url,
		createdAt: new Date(row.created_at),
		totalSubtasks: Number(row.total_subtasks),
		builtSubtasks: Number(row.built_subtasks),
		failedSubtasks: Number(row.failed_subtasks),
		nextCardTitle: row.next_card_title ?? null,
		totalMilestones: Number(row.total_milestones),
		completedMilestones: Number(row.completed_milestones),
	}))
}
