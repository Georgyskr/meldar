import { sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'

export async function GET(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const db = getDb()
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

	// Use raw SQL to get rowCount without materializing all deleted IDs
	const sessionResult = await db.execute(
		sql`DELETE FROM discovery_sessions
			WHERE created_at < ${thirtyDaysAgo}
			  AND tier_purchased IS NULL`,
	)

	// Don't delete xray results that are referenced by paid audit orders
	const xrayResult = await db.execute(
		sql`DELETE FROM xray_results
			WHERE created_at < ${thirtyDaysAgo}
			  AND NOT EXISTS (
			    SELECT 1 FROM audit_orders
			    WHERE audit_orders.xray_id = xray_results.id
			  )`,
	)

	const deletedSessionCount = sessionResult.rowCount ?? 0
	const deletedXrayCount = xrayResult.rowCount ?? 0

	console.log(
		`[purge] Deleted ${deletedSessionCount} sessions and ${deletedXrayCount} xray results`,
	)

	return Response.json({
		purged: {
			sessions: deletedSessionCount,
			xrays: deletedXrayCount,
		},
	})
}
