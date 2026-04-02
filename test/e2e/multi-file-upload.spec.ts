import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, startFresh, toUploadPhase } from './helpers'

/**
 * E2E: Multi-file upload — user selects 3 images at once.
 * Tests the `multiple` attribute on the file input and parallel processing.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

async function toUploadPhaseWithCounter(page: Page) {
	let uploadCount = 0

	await startFresh(page, { session: { sessionId: 'multi' } })
	// Override upload with counting mock (last-registered-wins)
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

	await fillQuiz(page)
	await acceptOptIn(page)

	return { getUploadCount: () => uploadCount }
}

test('selecting 3 images at once uploads all 3', async ({ page }) => {
	const { getUploadCount } = await toUploadPhaseWithCounter(page)

	const card = page.getByTestId('upload-card-screentime')
	const fileInput = card.locator('input[type="file"]').first()

	// Select all 3 images at once
	await fileInput.setInputFiles([
		path.join(ASSETS, 'most-used.jpeg'),
		path.join(ASSETS, 'pickups.jpeg'),
		path.join(ASSETS, 'notifications.jpeg'),
	])

	// Wait for all 3 uploads to complete — card should show "3 of 3 done"
	await expect(card.locator('text=3 of 3 done')).toBeVisible({ timeout: 60000 })

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
