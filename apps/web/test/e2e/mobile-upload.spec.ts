import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, startFresh } from './helpers'

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

	test('data terms block is visible and clickable at mobile size', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		const termsBlock = page.locator('#data-terms')
		await termsBlock.scrollIntoViewIfNeeded()
		await expect(termsBlock).toBeVisible()

		await page.locator('button:has-text("I agree, let me upload")').click()
		await expect(page.locator('text=Data terms accepted')).toBeVisible()
	})

	test('uploading a real image at mobile viewport completes without crash', async ({ page }) => {
		await toUploadPhaseOnMobile(page)

		await acceptOptIn(page)

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
