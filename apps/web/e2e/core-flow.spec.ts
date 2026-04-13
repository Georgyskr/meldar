import { getDb } from '@meldar/db/client'
import { projects, users } from '@meldar/db/schema'
import { expect, type Page, test } from '@playwright/test'
import { eq } from 'drizzle-orm'

const TEST_EMAIL = `e2e-core-${Date.now()}@meldar-test.local`
const TEST_PASSWORD = 'e2e-test-password-9876!'

// Shared across serial tests — breaks if retries > 0 (retries reset worker state)
let signUpSucceeded = false
let createdProjectId: string | undefined

test.use({ storageState: { cookies: [], origins: [] } })

async function signInViaUI(page: Page): Promise<void> {
	await page.goto('/sign-in')
	await page.fill('#signin-email', TEST_EMAIL)
	await page.fill('#signin-password', TEST_PASSWORD)
	await page.getByRole('button', { name: /sign in/i }).click()
	await page.waitForURL('**/workspace**', { timeout: 15_000 })
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
			await expect(page.getByText("What's your business?")).toBeVisible()
			signUpSucceeded = true
		})

		test('onboarding \u2014 pick vertical, create project, land in workspace', async ({ page }) => {
			test.skip(!signUpSucceeded, 'Sign-up did not complete')

			await signInViaUI(page)
			await page.goto('/onboarding')
			await expect(page.getByText("What's your business?")).toBeVisible()

			await page
				.getByRole('button')
				.filter({ hasText: /Consulting/ })
				.click()
			await page.getByRole('button', { name: /create my booking page/i }).click()

			// Creating state must appear (ASCII dots, not unicode ellipsis)
			await expect(page.getByText('Setting up your booking page...')).toBeVisible()

			// Race: "ready" vs "timed out" vs error toast — fail fast with clear message
			const ready = page.getByText('Your booking page is ready!')
			const timedOut = page.getByText('Taking longer than expected...')
			const outcome = await Promise.race([
				expect(ready)
					.toBeVisible({ timeout: 30_000 })
					.then(() => 'ready' as const),
				expect(timedOut)
					.toBeVisible({ timeout: 30_000 })
					.then(() => 'timedOut' as const),
			])
			expect(outcome, `Onboarding did not complete: got "${outcome}" instead of "ready"`).toBe(
				'ready',
			)

			await page.getByRole('button', { name: /go to your dashboard/i }).click()

			await page.waitForURL('**/workspace/**')
			const match = page.url().match(/\/workspace\/([0-9a-f-]{36})/)
			expect(match).toBeTruthy()
			createdProjectId = match?.[1]
		})

		test('workspace loads with empty-state prompt and feedback bar', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')

			await signInViaUI(page)
			await page.goto(`/workspace/${createdProjectId}`)

			await expect(page.getByText('Describe what you want to build')).toBeVisible()
			await expect(page.locator('textarea')).toBeVisible()
			await expect(page.getByLabel('Send feedback')).toBeVisible()
		})

		test('type prompt, trigger build, build completes with outcome', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')
			test.setTimeout(180_000)

			await signInViaUI(page)
			await page.goto(`/workspace/${createdProjectId}`)

			const textarea = page.locator('textarea')
			await expect(textarea).toBeVisible()

			await textarea.fill(
				'Create a simple landing page with a headline that says Welcome and a paragraph describing the business',
			)

			await page.getByLabel('Send feedback').click()

			// Build must start: overlay pill uses unicode ellipsis (\u2026), NOT ASCII dots
			await expect(page.getByText('Updating\u2026')).toBeVisible({ timeout: 60_000 })

			// Build must finish: the building pill must disappear
			await expect(page.getByText('Updating\u2026')).toBeHidden({ timeout: 120_000 })

			// Wait for outcome to render before checking — retrying assertion, not snapshot
			const donePill = page.getByText('\u2713 Updated')
			const failedPill = page.getByText('Build failed')
			const errorToast = page.getByRole('alert').filter({ hasText: /build failed/i })
			const outcomeLocator = donePill.or(failedPill).or(errorToast)
			await expect(outcomeLocator).toBeVisible({ timeout: 10_000 })

			// Now snapshot is safe — at least one outcome element is in the DOM
			const succeeded = await donePill.isVisible()

			if (!succeeded) {
				const toastEl = page.getByRole('alert').first()
				await expect(toastEl).toBeVisible()
				const text = await toastEl.textContent()
				expect(text?.length).toBeGreaterThan(10)
				expect(text).not.toContain('Something went wrong')
			}
		})

		test('admin dashboard renders tabs and settings page loads', async ({ page }) => {
			test.skip(!createdProjectId, 'No project from previous test')

			await signInViaUI(page)
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

			await signInViaUI(page)
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
