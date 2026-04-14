// Global reaper for wedged `status='streaming'` builds. The per-project
// reapStuckBuilds only fires under active traffic, so abandoned streams
// (client crash, tab close) sit forever and block ux_builds_project_streaming.
// 30 minutes is well over any legitimate token-budgeted stream.
import { getDb } from '@meldar/db/client'
import { sql } from 'drizzle-orm'
import { verifyCronAuth } from '@/server/lib/cron-auth'

export async function GET(request: Request) {
	if (!verifyCronAuth(request)) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const startedAt = Date.now()
	const db = getDb()

	try {
		const result = await db.execute(
			sql`UPDATE builds
			    SET status = 'failed',
			        error_message = 'reaper: streaming build exceeded 30 min without completion',
			        completed_at = NOW()
			    WHERE status = 'streaming'
			      AND created_at < NOW() - INTERVAL '30 minutes'`,
		)
		const reapedCount = result.rowCount ?? 0

		console.log(
			JSON.stringify({
				event: 'cron.reap_streaming_builds',
				timestamp: new Date().toISOString(),
				reapedCount,
				durationMs: Date.now() - startedAt,
			}),
		)

		return Response.json({ reaped: reapedCount })
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
