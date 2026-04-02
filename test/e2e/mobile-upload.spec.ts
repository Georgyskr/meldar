import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { fillQuiz, startFresh } from './helpers'

/**
 * E2E: Mobile viewport (375x812) — upload phase rendering and interaction.
 * Verifies the upload hub works correctly at iPhone-sized viewports.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

async function toUploadPhaseOnMobile(page: Page) {
	await page.setViewportSize({ width: 375, height: 812 })
	await startFresh(page, { session: { sessionId: 'mobile-test' } })
	await fillQuiz(page)
}

test.describe('Mobile Upload (375x812)', () => {
	test('upload cards are visible (may need scroll)', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		// Screen Time card should be visible immediately or after scroll
		const screenTimeCard = page.getByTestId('upload-card-screentime')
		await screenTimeCard.scrollIntoViewIfNeeded()
		await expect(screenTimeCard).toBeVisible()

		// Subscriptions card
		const subsCard = page.getByTestId('upload-card-subscriptions')
		await subsCard.scrollIntoViewIfNeeded()
		await expect(subsCard).toBeVisible()

		// ChatGPT card (deep analysis section)
		const chatgptCard = page.getByTestId('upload-card-chatgpt')
		await chatgptCard.scrollIntoViewIfNeeded()
		await expect(chatgptCard).toBeVisible()
	})

	test('opt-in checkbox is visible and clickable at mobile size', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		const checkbox = page.locator('#data-opt-in')
		await checkbox.scrollIntoViewIfNeeded()
		await expect(checkbox).toBeVisible()

		// Click the label to toggle
		await page.locator('text=I agree that my uploaded data').click()
		await expect(checkbox).not.toBeVisible()
	})

	test('uploading a real image at mobile viewport completes without crash', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		// Opt in first
		await page.locator('text=I agree that my uploaded data').click()
		await expect(page.locator('#data-opt-in')).not.toBeVisible()

		const card = page.getByTestId('upload-card-screentime')
		await card.scrollIntoViewIfNeeded()
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

		// Wait for upload to complete
		await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })

		// Page should still be functional
		await expect(page.locator('text=Add your data')).toBeVisible()
	})

	test('Generate and Skip buttons are visible and full-width at mobile', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		const generateBtn = page.getByTestId('generate-results-button')
		await generateBtn.scrollIntoViewIfNeeded()
		await expect(generateBtn).toBeVisible()

		const skipBtn = page.getByTestId('skip-button')
		await skipBtn.scrollIntoViewIfNeeded()
		await expect(skipBtn).toBeVisible()
		await expect(skipBtn).toBeEnabled()

		// Verify the buttons are reasonably wide (full-width on mobile)
		const generateBox = await generateBtn.boundingBox()
		expect(generateBox).not.toBeNull()
		// On 375px viewport with padding, button should be at least 280px wide
		expect(generateBox?.width).toBeGreaterThan(280)

		const skipBox = await skipBtn.boundingBox()
		expect(skipBox).not.toBeNull()
		expect(skipBox?.width).toBeGreaterThan(280)
	})
})
