import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { xrayResults } from '@/server/db/schema'

export async function getXRay(id: string) {
	const db = getDb()
	const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
	return rows[0] || null
}
