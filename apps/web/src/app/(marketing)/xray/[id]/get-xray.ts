import { getDb } from '@meldar/db/client'
import { xrayResults } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'

export async function getXRay(id: string) {
	const db = getDb()
	const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
	return rows[0] || null
}
