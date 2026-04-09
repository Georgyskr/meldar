import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { test as setup } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { E2E_USER, STORAGE_STATE } from './fixtures'

setup('authenticate test user', async ({ page }) => {
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		throw new Error('AUTH_SECRET is not set — E2E auth setup requires it in .env.local')
	}
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set — E2E auth setup requires it in .env.local')
	}

	const db = getDb()
	const passwordHash = await bcrypt.hash(E2E_USER.password, 10)

	const existing = await db
		.select({ id: users.id, tokenVersion: users.tokenVersion })
		.from(users)
		.where(eq(users.email, E2E_USER.email))
		.limit(1)

	let userId: string
	let tokenVersion: number

	if (existing.length === 0) {
		const [created] = await db
			.insert(users)
			.values({
				email: E2E_USER.email,
				passwordHash,
				name: E2E_USER.name,
				emailVerified: true,
				authProvider: 'email',
			})
			.returning({ id: users.id, tokenVersion: users.tokenVersion })
		userId = created.id
		tokenVersion = created.tokenVersion
	} else {
		userId = existing[0].id
		tokenVersion = existing[0].tokenVersion
		await db.update(users).set({ passwordHash, emailVerified: true }).where(eq(users.id, userId))
	}

	const token = jwt.sign(
		{ userId, email: E2E_USER.email, emailVerified: true, tokenVersion },
		secret,
		{ expiresIn: '7d', algorithm: 'HS256' },
	)

	const authDir = path.dirname(STORAGE_STATE)
	if (!fs.existsSync(authDir)) {
		fs.mkdirSync(authDir, { recursive: true })
	}

	await page.context().addCookies([
		{
			name: 'meldar-auth',
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
			expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
		},
	])

	await page.context().storageState({ path: STORAGE_STATE })
})
