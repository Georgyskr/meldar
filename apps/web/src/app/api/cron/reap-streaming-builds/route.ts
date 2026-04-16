import { getDb } from '@meldar/db/client'
import { sql } from 'drizzle-orm'
import { verifyCronAuth } from '@/server/lib/cron-auth'

const RETENTION_BATCH_LIMIT = 10_000

export async function GET(request: Request) {
	if (!verifyCronAuth(request)) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const startedAt = Date.now()
	const db = getDb()

	try {
		const pipelineReap = await db.execute(
			sql`UPDATE pipeline_runs
			    SET state = 'cancelled',
			        ended_at = NOW(),
			        error_code = 'reaper_heartbeat_stale',
			        error_reason = 'reaper: heartbeat_at older than 10 min'
			    WHERE state IN ('running', 'deploying')
			      AND heartbeat_at < NOW() - INTERVAL '10 minutes'`,
		)
		const pipelinesReaped = pipelineReap.rowCount ?? 0

		const buildsReap = await db.execute(
			sql`UPDATE builds
			    SET status = 'failed',
			        error_message = 'reaper: streaming build exceeded 30 min without completion',
			        completed_at = NOW()
			    WHERE status = 'streaming'
			      AND created_at < NOW() - INTERVAL '30 minutes'`,
		)
		const buildsReapedCount = buildsReap.rowCount ?? 0

		const retentionReap = await db.execute(
			sql`DELETE FROM pipeline_runs
			    WHERE id IN (
			      SELECT id FROM pipeline_runs
			      WHERE state IN ('succeeded','failed','cancelled')
			        AND ended_at < NOW() - INTERVAL '30 days'
			      LIMIT ${RETENTION_BATCH_LIMIT}
			    )`,
		)
		const runsPurged = retentionReap.rowCount ?? 0

		console.log(
			JSON.stringify({
				event: 'cron.reap_streaming_builds',
				timestamp: new Date().toISOString(),
				outcome: 'ok',
				pipelinesReaped,
				buildsReaped: buildsReapedCount,
				runsPurged,
				retentionBatchLimit: RETENTION_BATCH_LIMIT,
				durationMs: Date.now() - startedAt,
			}),
		)

		return Response.json({ pipelinesReaped, buildsReaped: buildsReapedCount, runsPurged })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(
			JSON.stringify({
				event: 'cron.reap_streaming_builds',
				timestamp: new Date().toISOString(),
				outcome: 'error',
				durationMs: Date.now() - startedAt,
				error: message,
			}),
		)
		return Response.json({ error: 'reaper_failed', message }, { status: 500 })
	}
}
