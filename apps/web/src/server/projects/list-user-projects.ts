import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'

export type WorkspaceProjectListItem = {
	id: string
	name: string
	lastBuildAt: Date | null
	previewUrl: string | null
	createdAt: Date
}

export async function listUserProjects(userId: string): Promise<WorkspaceProjectListItem[]> {
	const db = getDb()
	const rows = await db
		.select({
			id: projects.id,
			name: projects.name,
			lastBuildAt: projects.lastBuildAt,
			previewUrl: projects.previewUrl,
			createdAt: projects.createdAt,
		})
		.from(projects)
		.where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
		.orderBy(sql`${projects.lastBuildAt} DESC NULLS LAST`, desc(projects.createdAt))
	return rows
}
