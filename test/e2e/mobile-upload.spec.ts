import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: Mobile viewport (375x812) — upload phase rendering and interaction.
 * Verifies the upload hub works correctly at iPhone-sized viewports.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

function mockApis(page: Page) {
	return Promise.all([
		page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'mobile-test' }) }),
		),
		page.route('**/api/discovery/upload', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					platform: 'screentime',
					preview: {
						apps: [{ name: 'Cup Heroes', usageMinutes: 362, category: 'gaming' }],
						totalScreenTimeMinutes: 590,
						pickups: 53,
					},
				}),
			}),
		),
		page.route('**/api/discovery/adaptive', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ followUps: [] }) }),
		),
		page.route('**/api/discovery/analyze', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					sessionId: 'mobile-test',
					analysis: {
						recommendedApp: { name: 'A1', description: 'd', whyThisUser: 'w', complexity: 'beginner', estimatedBuildTime: '1h' },
						additionalApps: [{ name: 'A2', description: 'd', whyThisUser: 'w' }],
						learningModules: [{ id: 'm', title: 'M', description: 'd', locked: false }],
						keyInsights: [{ headline: 'h', detail: 'd', source: 's' }],
						dataProfile: { totalSourcesAnalyzed: 1, topProblemAreas: ['x'], aiUsageLevel: 'l' },
					},
				}),
			}),
		),
	])
}

async function toUploadPhaseOnMobile(page: Page) {
	await page.setViewportSize({ width: 375, height: 812 })
	await mockApis(page)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.addInitScript(() => {
		if (!sessionStorage.getItem('_e2e_init')) {
			sessionStorage.setItem('_e2e_init', '1')
			localStorage.clear()
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
		}
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })

	// Fill quiz
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
		await card.locator('input[type="file"]').first().setInputFiles(
			path.join(ASSETS, 'most-used.jpeg'),
		)

		// Wait for upload to complete
		await expect(card.locator('text=1 of 4 sections')).toBeVisible({ timeout: 30000 })

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
		expect(generateBox!.width).toBeGreaterThan(280)

		const skipBox = await skipBtn.boundingBox()
		expect(skipBox).not.toBeNull()
		expect(skipBox!.width).toBeGreaterThan(280)
	})
})
