import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
	if (!_db) {
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL is not set')
		}
		_db = drizzle(neon(process.env.DATABASE_URL), { schema })
	}
	return _db
}
