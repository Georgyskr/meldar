import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function verifyProjectOwnership(projectId: string, userId: string) {
	const db = getDb()
	const [project] = await db
		.select({ id: projects.id })
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
		.limit(1)
	return project ?? null
}
