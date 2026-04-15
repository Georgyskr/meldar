import { getDb } from '@meldar/db/client'
import { projects, users } from '@meldar/db/schema'
import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const TEST_EMAIL = `e2e-reload-${Date.now()}@meldar-test.local`
const TEST_PASSWORD = 'E2e-reload-password-9876!'

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ retries: 0 })

async function injectAuthCookie(page: import('@playwright/test').Page): Promise<void> {
	const secret = process.env.AUTH_SECRET
	if (!secret) throw new Error('AUTH_SECRET required')
	const db = getDb()
	const [user] = await db
		.select({ id: users.id, tokenVersion: users.tokenVersion })
		.from(users)
		.where(eq(users.email, TEST_EMAIL))
		.limit(1)
	if (!user) throw new Error(`Test user ${TEST_EMAIL} not found`)
	const token = jwt.sign(
		{
			userId: user.id,
			email: TEST_EMAIL,
			emailVerified: false,
			tokenVersion: user.tokenVersion,
		},
		secret,
		{ expiresIn: '7d', algorithm: 'HS256' },
	)
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
}

test.describe('Workspace reload recovery', () => {
	test.afterAll(async () => {
		try {
			const db = getDb()
			const [user] = await db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.email, TEST_EMAIL))
				.limit(1)
			if (user) {
				await db.delete(projects).where(eq(projects.userId, user.id))
				await db.delete(users).where(eq(users.id, user.id))
			}
		} catch (err) {
			console.error('[e2e reload-recovery cleanup]', err)
		}
	})

	test('reloading mid-setup is not a dead-end — pill or preview recovers', async ({ page }) => {
		test.setTimeout(180_000)
		let projectId: string | null = null

		await test.step('sign up + onboard', async () => {
			await page.goto('/sign-up')
			await page.fill('#signup-email', TEST_EMAIL)
			await page.fill('#signup-password', TEST_PASSWORD)
			await page.getByRole('button', { name: /create account/i }).click()
			await page.waitForURL('**/onboarding**')
			await injectAuthCookie(page)
			await page.goto('/onboarding')
			await page.getByRole('button', { name: /I need something for my business/i }).click()
			await page.getByRole('radio', { name: /Consulting/i }).click()
			await page.getByRole('button', { name: /Continue/i }).click()
			await expect(page.getByText(/put together for you/i)).toBeVisible()
			await page.getByRole('button', { name: /Let.*go/i }).click()
			await page.waitForURL('**/workspace/**', { timeout: 30_000 })
			projectId = page.url().match(/\/workspace\/([0-9a-f-]{36})/)?.[1] ?? null
			expect(projectId).toBeTruthy()
		})

		await test.step('wait for initial build pill to appear', async () => {
			const pill = page.getByTestId('build-pill')
			await expect(pill).toHaveAttribute('data-phase', 'building', { timeout: 45_000 })
		})

		await test.step('reload mid-build and verify workspace is NOT permanently stuck', async () => {
			await injectAuthCookie(page)
			await page.reload()
			const pill = page.getByTestId('build-pill')
			const iframe = page.locator('iframe[title="Live preview"]')
			// After reload the client MUST NOT silently stay on "Setting up your page…"
			// forever. Either the build resumes (pill 'building'), it completes
			// (iframe), or it fails (pill 'failed'). Stuck = regression.
			await Promise.race([
				expect(pill).toHaveAttribute('data-phase', /building|done|failed/, {
					timeout: 120_000,
				}),
				expect(iframe).toBeVisible({ timeout: 120_000 }),
			])
		})
	})
})
