import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: Multi-file upload — user selects 3 images at once.
 * Tests the `multiple` attribute on the file input and parallel processing.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

async function toUploadPhase(page: Page) {
	let uploadCount = 0
	await page.route('**/api/discovery/session', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'multi' }) }),
	)
	await page.route('**/api/discovery/upload', async (route) => {
		uploadCount++
		await route.fulfill({
			status: 200,
			body: JSON.stringify({
				success: true,
				platform: 'screentime',
				preview: {
					apps: [{ name: `App${uploadCount}`, usageMinutes: 100, category: 'social' }],
					totalScreenTimeMinutes: 300,
				},
			}),
		})
	})

	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/start', { waitUntil: 'domcontentloaded' })
	await page.evaluate(() => {
		localStorage.clear()
		localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })

	await page.locator('text=What do you do?').waitFor({ timeout: 8000 })
	await page.locator('button:has-text("Working")').click()
	await page.locator('text=How old are you?').waitFor({ timeout: 8000 })
	await page.locator('button:has-text("26-30")').click()
	await page.locator('text=What bugs you most?').waitFor({ timeout: 8000 })
	await page.locator('button:has-text("Email")').click()
	await page.locator('button:has-text("dinner")').click()
	await page.getByTestId('lock-button').click()
	await page.locator('text=How AI-savvy').waitFor({ timeout: 8000 })
	await page.locator('button:has-text("A few times")').click()
	await page.locator('text=Which AI tools').waitFor({ timeout: 8000 })
	await page.locator('button:has-text("ChatGPT")').click()
	await page.getByTestId('lock-button').click()
	await page.locator('text=Add your data').waitFor({ timeout: 8000 })

	await page.locator('text=I agree that my uploaded data').click()
	await expect(page.locator('#data-opt-in')).not.toBeVisible()

	return { getUploadCount: () => uploadCount }
}

test('selecting 3 images at once uploads all 3', async ({ page }) => {
	const { getUploadCount } = await toUploadPhase(page)

	const card = page.getByTestId('upload-card-screentime')
	const fileInput = card.locator('input[type="file"]').first()

	// Select all 3 images at once
	await fileInput.setInputFiles([
		path.join(ASSETS, 'most-used.jpeg'),
		path.join(ASSETS, 'pickups.jpeg'),
		path.join(ASSETS, 'notifications.jpeg'),
	])

	// Wait for all 3 uploads to complete — card should show 3 of 4
	await expect(card.locator('text=3 of 4 sections')).toBeVisible({ timeout: 60000 })

	// Verify all 3 API calls were made
	expect(getUploadCount()).toBe(3)
})

test('multi-select file input has multiple attribute on Screen Time card', async ({ page }) => {
	await toUploadPhase(page)

	const card = page.getByTestId('upload-card-screentime')
	const fileInput = card.locator('input[type="file"]').first()

	// The input should have the multiple attribute
	const hasMultiple = await fileInput.getAttribute('multiple')
	expect(hasMultiple).not.toBeNull()
})

test('single-source cards do NOT have multiple attribute', async ({ page }) => {
	await toUploadPhase(page)

	const subsCard = page.getByTestId('upload-card-subscriptions')
	const fileInput = subsCard.locator('input[type="file"]').first()

	const hasMultiple = await fileInput.getAttribute('multiple')
	expect(hasMultiple).toBeNull()
})
