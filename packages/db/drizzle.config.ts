import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '../../apps/web/.env.local' })

export default defineConfig({
	out: './migrations',
	schema: './src/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? '',
	},
})
