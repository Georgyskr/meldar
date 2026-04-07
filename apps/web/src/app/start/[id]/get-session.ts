import { getDb } from '@meldar/db/client'
import { discoverySessions } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'

export async function getSession(id: string) {
	const db = getDb()
	const rows = await db
		.select()
		.from(discoverySessions)
		.where(eq(discoverySessions.id, id))
		.limit(1)
	return rows[0] || null
}
