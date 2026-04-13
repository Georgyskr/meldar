import { getDb } from '@meldar/db/client'
import { projects, users } from '@meldar/db/schema'
import { expect, type Page, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const TEST_EMAIL = `e2e-funnel-${Date.now()}@meldar-test.local`
const TEST_PASSWORD = 'E2e-test-password-9876!'

let signUpSucceeded = false

test.use({ storageState: { cookies: [], origins: [] } })

async function injectAuthCookie(page: Page): Promise<void> {
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
		{ userId: user.id, email: TEST_EMAIL, emailVerified: false, tokenVersion: user.tokenVersion },
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

test.describe
	.serial('Onboarding funnel (v2)', () => {
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
				console.error('[e2e cleanup] Failed:', err)
			}
		})

		test('sign up creates account', async ({ page }) => {
			await page.goto('/sign-up', { waitUntil: 'domcontentloaded', timeout: 30_000 })
			await expect(page.getByText('Create your account')).toBeVisible()
			await page.fill('#signup-email', TEST_EMAIL)
			await page.fill('#signup-password', TEST_PASSWORD)
			await page.getByRole('button', { name: /create account/i }).click()
			await page.waitForURL('**/onboarding**', { timeout: 15_000 })
			signUpSucceeded = true
		})

		test('Door A: vertical picker → proposal → workspace', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')
			test.setTimeout(60_000)

			await injectAuthCookie(page)
			await page.goto('/onboarding')

			// Screen 1: 3 doors
			await expect(page.getByText('What do you need today')).toBeVisible()

			// Pick Door A
			await page.getByRole('button', { name: /I need something for my business/i }).click()

			// Door A: vertical picker
			await expect(page.getByText('What kind of business')).toBeVisible()
			await page.getByRole('button', { name: /Consulting/i }).click()

			// Continue to proposal
			await page.getByRole('button', { name: /Continue/i }).click()

			// Proposal Preview
			await expect(page.getByText(/put together for you/i)).toBeVisible()
			await expect(page.getByText('Discovery call')).toBeVisible()

			// No prices visible
			const previewText = await page.locator('body').textContent()
			expect(previewText).not.toMatch(/€\d|EUR \d/)

			// Confirm
			await page.getByRole('button', { name: /Let.*go/i }).click()

			// Should redirect to workspace
			await page.waitForURL('**/workspace/**', { timeout: 30_000 })
			expect(page.url()).toMatch(/\/workspace\/[0-9a-f-]{36}/)
		})

		test('Door B: examples → proposal → workspace', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')
			test.setTimeout(60_000)

			await injectAuthCookie(page)
			await page.goto('/onboarding')

			await expect(page.getByText('What do you need today')).toBeVisible()

			// Pick Door B
			await page.getByRole('button', { name: /Show me what this can do/i }).click()
			await expect(page.getByText('Real pages made with Meldar')).toBeVisible()

			// Select first example
			const useThisButtons = page.getByRole('button', { name: /Use this/i })
			await useThisButtons.first().click()

			// Proposal Preview
			await expect(page.getByText(/put together for you/i)).toBeVisible()

			// Confirm
			await page.getByRole('button', { name: /Let.*go/i }).click()
			await page.waitForURL('**/workspace/**', { timeout: 30_000 })
		})

		test('Door C: freeform → proposal → workspace', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')
			test.setTimeout(60_000)

			await injectAuthCookie(page)
			await page.goto('/onboarding')

			await expect(page.getByText('What do you need today')).toBeVisible()

			// Pick Door C
			await page.getByRole('button', { name: /I have an idea/i }).click()
			await expect(page.getByText('eating your time')).toBeVisible()

			// Type description
			await page.locator('textarea').fill('I run a personal training studio and need booking')

			// Submit
			await page.getByRole('button', { name: /See what Meldar suggests/i }).click()

			// Proposal Preview
			await expect(page.getByText(/put together for you/i)).toBeVisible()

			// Confirm
			await page.getByRole('button', { name: /Let.*go/i }).click()
			await page.waitForURL('**/workspace/**', { timeout: 30_000 })
		})

		test('"Change things" goes back to source door', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')

			await injectAuthCookie(page)
			await page.goto('/onboarding')

			// Door A → vertical picker → proposal
			await page.getByRole('button', { name: /I need something for my business/i }).click()
			await page.getByRole('button', { name: /Consulting/i }).click()
			await page.getByRole('button', { name: /Continue/i }).click()
			await expect(page.getByText(/put together for you/i)).toBeVisible()

			// Click "Change things"
			await page.getByRole('button', { name: /Change things/i }).click()

			// Should be back on Door A with vertical picker visible
			await expect(page.getByText('What kind of business')).toBeVisible()
		})

		test('back from Door A returns to 3 doors', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')

			await injectAuthCookie(page)
			await page.goto('/onboarding')

			await page.getByRole('button', { name: /I need something for my business/i }).click()
			await expect(page.getByText('What kind of business')).toBeVisible()

			const backBtn = page.getByRole('button', { name: /back/i })
			await backBtn.click()
			await expect(page.getByText('What do you need today')).toBeVisible()
		})
	})
