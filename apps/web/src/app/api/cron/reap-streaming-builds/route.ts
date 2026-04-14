/**
 * F7 — periodic reaper for wedged `streaming` builds.
 *
 * The storage layer's per-project `reapStuckBuilds` only fires during active
 * traffic on that specific project. A user abandoning mid-stream (closing
 * the tab, losing connection, Vercel function crashing) leaves the
 * `builds.status='streaming'` row alive forever, blocking the partial-unique
 * index `ux_builds_project_streaming` from accepting future streams for that
 * project. This global cron sweeps those orphans every 5 minutes.
 *
 * Threshold: 30 minutes. A live streaming build doesn't legitimately run
 * that long — max token budgets cap it well below. Anything past 30m is
 * definitively abandoned.
 */

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

		// One structured line per run so Vercel Logs can filter on event name
		// and alerting can watch for reaper silence (no lines for >10m = cron down).
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
		// DB connection failures happen (Neon cold-resume timeouts, pool
		// exhaustion). Don't let the cron 500 silently — log structured so the
		// same dashboard that watches the happy-path line catches failures.
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
