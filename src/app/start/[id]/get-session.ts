import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'

export async function getSession(id: string) {
	const db = getDb()
	const rows = await db
		.select()
		.from(discoverySessions)
		.where(eq(discoverySessions.id, id))
		.limit(1)
	return rows[0] || null
}
