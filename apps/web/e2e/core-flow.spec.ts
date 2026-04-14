import { getDb } from '@meldar/db/client'
import { projects, users } from '@meldar/db/schema'
import { expect, type Page, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const TEST_EMAIL = `e2e-core-${Date.now()}@meldar-test.local`
const TEST_PASSWORD = 'E2e-test-password-9876!'

// Shared across serial tests — breaks if retries > 0 (retries reset worker state)
let signUpSucceeded = false
let createdProjectId: string | undefined

test.use({ storageState: { cookies: [], origins: [] } })

async function injectAuthCookie(page: Page): Promise<void> {
	const secret = process.env.AUTH_SECRET
	if (!secret) throw new Error('AUTH_SECRET required for E2E cookie injection')

	const db = getDb()
	const [user] = await db
		.select({ id: users.id, tokenVersion: users.tokenVersion })
		.from(users)
		.where(eq(users.email, TEST_EMAIL))
		.limit(1)
	if (!user) throw new Error(`Test user ${TEST_EMAIL} not found — sign-up test may have failed`)

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

const IGNORED_CONSOLE_PATTERNS = [
	/Download the React DevTools/,
	/Warning: Each child in a list/,
	/migrated since no migrate function/,
]

function collectConsoleErrors(page: Page): string[] {
	const errors: string[] = []
	page.on('console', (msg) => {
		if (msg.type() !== 'error') return
		const text = msg.text()
		if (IGNORED_CONSOLE_PATTERNS.some((p) => p.test(text))) return
		errors.push(text)
	})
	return errors
}

test.describe
	.serial('Core user flow', () => {
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
				console.error('[e2e cleanup] Failed to clean up test user:', err)
			}
		})

		test('sign up and land on onboarding', async ({ page }) => {
			await page.goto('/sign-up')
			await expect(page.getByText('Create your account')).toBeVisible()

			await page.fill('#signup-email', TEST_EMAIL)
			await page.fill('#signup-password', TEST_PASSWORD)
			await page.getByRole('button', { name: /create account/i }).click()

			await page.waitForURL('**/onboarding**')
			await expect(page.getByText('What do you need today')).toBeVisible()
			signUpSucceeded = true
		})

		test('onboarding \u2014 Door A through to workspace', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')

			await injectAuthCookie(page)
			await page.goto('/onboarding')
			await expect(page.getByText('What do you need today')).toBeVisible()

			// Door A
			await page.getByRole('button', { name: /I need something for my business/i }).click()
			await expect(page.getByText('What kind of business')).toBeVisible()

			// Pick Consulting
			await page.getByRole('radio', { name: /Consulting/i }).click()
			await page.getByRole('button', { name: /Continue/i }).click()

			// Proposal Preview
			await expect(page.getByText(/put together for you/i)).toBeVisible()
			await page.getByRole('button', { name: /Let.*go/i }).click()

			await page.waitForURL('**/workspace/**', { timeout: 30_000 })
			const match = page.url().match(/\/workspace\/([0-9a-f-]{36})/)
			expect(match).toBeTruthy()
			createdProjectId = match?.[1]
		})

		test('workspace loads with setup state and feedback bar', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')

			await injectAuthCookie(page)
			await page.goto(`/workspace/${createdProjectId}`)

			await expect(page.getByText(/Setting up your page|Opening your page/i)).toBeVisible()
			await expect(page.locator('textarea')).toBeVisible()
			await expect(page.getByLabel('Send feedback')).toBeVisible()
		})

		test('type prompt, trigger build, build completes with outcome', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')
			test.setTimeout(180_000)
			const consoleErrors = collectConsoleErrors(page)

			await injectAuthCookie(page)
			await page.goto(`/workspace/${createdProjectId}`)

			const textarea = page.locator('textarea')
			await expect(textarea).toBeVisible()

			await textarea.fill(
				'Create a simple landing page with a headline that says Welcome and a paragraph describing the business',
			)

			await page.getByLabel('Send feedback').click()

			// Build can start (showing "Updating…") or fail immediately (e.g. R2 not configured)
			const buildingPill = page.getByText('Updating\u2026')
			const errorToast = page.getByRole('alert').filter({ hasText: /build failed/i })
			await expect(buildingPill.or(errorToast)).toBeVisible({ timeout: 60_000 })

			const buildStarted = await buildingPill.isVisible()

			if (buildStarted) {
				// Build started — wait for it to finish
				await expect(buildingPill).toBeHidden({ timeout: 120_000 })

				const donePill = page.getByText('\u2713 Updated')
				const failedPill = page.getByText('Build failed')
				const outcomeLocator = donePill.or(failedPill).or(errorToast)
				await expect(outcomeLocator).toBeVisible({ timeout: 10_000 })

				const succeeded = await donePill.isVisible()
				if (!succeeded) {
					const toastEl = page.getByRole('alert').first()
					await expect(toastEl).toBeVisible()
					const text = await toastEl.textContent()
					expect(text?.length).toBeGreaterThan(10)
					expect(text).not.toContain('Something went wrong')
				}
			} else {
				// Build failed immediately — verify error is meaningful, not silently swallowed
				const toastEl = page.getByRole('alert').first()
				await expect(toastEl).toBeVisible()
				const text = await toastEl.textContent()
				expect(text?.length).toBeGreaterThan(10)
				expect(text).not.toContain('Something went wrong')
			}

			expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toHaveLength(
				0,
			)
		})

		test('admin dashboard renders tabs and settings page loads', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')

			await injectAuthCookie(page)
			await page.goto(`/workspace/${createdProjectId}/admin`)

			await expect(page.getByText('Manage your bookings and review AI actions.')).toBeVisible()

			await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible()
			await expect(page.getByRole('button', { name: 'Bookings' })).toBeVisible()
			await expect(page.getByRole('button', { name: 'Approvals' })).toBeVisible()

			await page.goto(`/workspace/${createdProjectId}/admin/settings`)
			await expect(page.getByText('Business details')).toBeVisible()
			await expect(page.getByText('Services')).toBeVisible()
			await expect(page.getByText('Available hours')).toBeVisible()
		})

		test('settings save persists across page reload', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')

			await injectAuthCookie(page)
			await page.goto(`/workspace/${createdProjectId}/admin/settings`)
			await expect(page.getByText('Business details')).toBeVisible()

			const uniqueName = `E2E Biz ${Date.now()}`
			const nameInput = page.locator('#settings-name')
			await nameInput.clear()
			await nameInput.fill(uniqueName)

			const saveButton = page.getByRole('button', { name: /save changes/i })
			await saveButton.click()

			// Success toast must appear
			await expect(page.getByRole('alert').filter({ hasText: /settings saved/i })).toBeVisible({
				timeout: 10_000,
			})

			// Button must revert to idle state
			await expect(saveButton).toBeVisible()

			// Error toast must NOT have appeared
			await expect(page.getByRole('alert').filter({ hasText: /could not save/i })).toBeHidden()

			// PERSISTENCE: reload and verify the value was written to the database
			await page.reload()
			await expect(page.getByText('Business details')).toBeVisible()
			await expect(nameInput).toHaveValue(uniqueName)
		})
	})
