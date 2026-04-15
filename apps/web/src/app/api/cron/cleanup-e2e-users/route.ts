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
			sql`DELETE FROM users
			    WHERE email LIKE '%@meldar-test.local'
			      AND created_at < NOW() - INTERVAL '24 hours'`,
		)
		const deleted = result.rowCount ?? 0

		console.log(
			JSON.stringify({
				event: 'cron.cleanup_e2e_users',
				timestamp: new Date().toISOString(),
				deleted,
				durationMs: Date.now() - startedAt,
			}),
		)

		return Response.json({ deleted })
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(
			JSON.stringify({
				event: 'cron.cleanup_e2e_users',
				timestamp: new Date().toISOString(),
				outcome: 'error',
				durationMs: Date.now() - startedAt,
				error: message,
			}),
		)
		return Response.json({ error: 'cleanup_failed', message }, { status: 500 })
	}
}
