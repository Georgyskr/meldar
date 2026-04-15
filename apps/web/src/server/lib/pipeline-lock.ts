import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { and, eq, isNull, or, sql } from 'drizzle-orm'

const STALE_PIPELINE_AFTER_MS = 10 * 60 * 1000

export type PipelineLockResult =
	| { readonly ok: true; readonly pipelineId: string }
	| { readonly ok: false; readonly reason: 'project_not_found' | 'pipeline_active' }

/**
 * Atomically acquires the pipeline lock on a project. Uses a conditional UPDATE
 * with WHERE so two concurrent acquires can't both succeed: only the first
 * UPDATE (where pipeline_active_at is null OR stale) returns a row.
 *
 * Stale locks (older than STALE_PIPELINE_AFTER_MS) are reclaimable — covers the
 * case where a previous pipeline crashed without releasing.
 */
export async function acquirePipelineLock(projectId: string): Promise<PipelineLockResult> {
	const db = getDb()
	const pipelineId = crypto.randomUUID()
	const staleBefore = new Date(Date.now() - STALE_PIPELINE_AFTER_MS)

	const updated = await db
		.update(projects)
		.set({
			pipelineActiveAt: new Date(),
			pipelineActiveId: pipelineId,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(projects.id, projectId),
				or(isNull(projects.pipelineActiveAt), sql`${projects.pipelineActiveAt} < ${staleBefore}`),
			),
		)
		.returning({ id: projects.id })

	if (updated.length > 0) {
		return { ok: true, pipelineId }
	}

	// Either the project doesn't exist, or someone else holds the lock.
	const [row] = await db
		.select({ id: projects.id })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1)
	if (!row) return { ok: false, reason: 'project_not_found' }
	return { ok: false, reason: 'pipeline_active' }
}

/** Releases the lock unconditionally. Safe to call from a `finally`. */
export async function releasePipelineLock(projectId: string, pipelineId: string): Promise<void> {
	const db = getDb()
	await db
		.update(projects)
		.set({
			pipelineActiveAt: null,
			pipelineActiveId: null,
			updatedAt: new Date(),
		})
		.where(and(eq(projects.id, projectId), eq(projects.pipelineActiveId, pipelineId)))
}

/** Read-only check: is a pipeline currently holding the lock? */
export async function isPipelineActive(projectId: string): Promise<boolean> {
	const db = getDb()
	const staleBefore = new Date(Date.now() - STALE_PIPELINE_AFTER_MS)
	const [row] = await db
		.select({ at: projects.pipelineActiveAt })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1)
	if (!row?.at) return false
	return row.at >= staleBefore
}
