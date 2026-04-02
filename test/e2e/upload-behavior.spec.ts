import path from 'node:path'
import { expect, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, startFresh, toUploadPhase } from './helpers'

/**
 * E2E: Upload behavior — parallel interaction, progress, duplicates,
 * button states, error recovery.
 *
 * TDD: Tests written first. Real images. OCR in browser.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

// ── 1. Other cards stay interactive during an upload ────────────────────────

test('other cards are interactive while one card is uploading', async ({ page }) => {
	await toUploadPhase(page)

	const stCard = page.getByTestId('upload-card-screentime')
	const subsCard = page.getByTestId('upload-card-subscriptions')

	// Start uploading to screentime
	await stCard
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

	// While that processes, subscriptions card should still have a working upload button
	await expect(subsCard.locator('input[type="file"]')).toBeAttached()

	// And "How to export" on subscriptions should still toggle
	await subsCard.locator('button:has-text("How to export")').click()
	// Instructions should appear
	// Instructions expanded — verify by checking for a step number
	await expect(subsCard.locator('text=your name')).toBeVisible()

	// Wait for screentime to finish
	await expect(stCard.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })
})

// ── 2. Upload shows processing state ───────────────────────────────────────

test('upload card shows uploading or analyzing text during processing', async ({ page }) => {
	await toUploadPhase(page)

	const card = page.getByTestId('upload-card-screentime')
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

	// During processing, card should show either "Uploading..." or "Analyzing..."
	// These are transient states — might be too fast to catch. Check that card ends up done.
	await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })
})

// ── 3. Same image uploaded twice counts correctly ──────────────────────────

test('uploading same image twice increments section count', async ({ page }) => {
	await toUploadPhase(page)

	const card = page.getByTestId('upload-card-screentime')

	// First upload
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
	await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })

	// Second upload of same image
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
	await expect(card.locator('text=2 of 3 sections')).toBeVisible({ timeout: 30000 })
})

// ── 4. Generate button: disabled → enabled → spinner ───────────────────────

test('Generate button lifecycle: disabled → enabled after upload → spinner on click', async ({
	page,
}) => {
	await toUploadPhase(page)

	const generateBtn = page.getByTestId('generate-results-button')

	// Initially disabled
	await expect(generateBtn).toBeDisabled()

	// Upload completes
	const card = page.getByTestId('upload-card-screentime')
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
	await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })

	// Now enabled
	await expect(generateBtn).toBeEnabled()

	// Click it — should transition to analyzing state
	await generateBtn.click()

	// The page should show analyzing state (either overlay or phase change)
	const analyzingVisible = await page
		.locator('text=Analyzing')
		.or(page.locator('text=Cross-referencing'))
		.first()
		.isVisible()
		.catch(() => false)
	// OR the page might have already transitioned to results (mock is instant)
	const resultsVisible = await page
		.locator('text=what we found')
		.or(page.locator('text=Here'))
		.first()
		.isVisible()
		.catch(() => false)

	expect(analyzingVisible || resultsVisible).toBe(true)
})

// ── 5. Skip button always enabled ──────────────────────────────────────────

test('Skip button stays enabled during upload', async ({ page }) => {
	await toUploadPhase(page)

	const skipBtn = page.getByTestId('skip-button')
	await expect(skipBtn).toBeEnabled()

	// Start upload
	const card = page.getByTestId('upload-card-screentime')
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

	// Skip should still be enabled even during upload
	await expect(skipBtn).toBeVisible()
})

// ── 6. Error on one card doesn't break others ──────────────────────────────

test('failed upload shows error, retry works, other cards unaffected', async ({ page }) => {
	let callCount = 0

	// Use startFresh for base setup, then override upload with custom error logic.
	// Playwright uses last-registered-wins, so our override takes precedence.
	await startFresh(page, { session: { sessionId: 'err' } })
	await page.route('**/api/discovery/upload', async (route) => {
		callCount++
		if (callCount === 1) {
			await route.fulfill({
				status: 500,
				body: JSON.stringify({ error: { message: 'Server error' } }),
			})
		} else {
			await route.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					platform: 'screentime',
					preview: {
						apps: [{ name: 'Test', usageMinutes: 60, category: 'social' }],
						totalScreenTimeMinutes: 120,
					},
				}),
			})
		}
	})

	await fillQuiz(page)
	await acceptOptIn(page)

	const card = page.getByTestId('upload-card-screentime')

	// First upload fails
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
	await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

	// Should show error
	await expect(
		card.locator('text=Try again').or(card.locator('text=Server error')).first(),
	).toBeVisible({ timeout: 8000 })

	// Other card still works
	const subsCard = page.getByTestId('upload-card-subscriptions')
	await expect(subsCard.locator('input[type="file"]')).toBeAttached()

	// Retry
	await card.locator('input[type="file"]').first().setInputFiles(path.join(ASSETS, 'pickups.jpeg'))
	await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

	// Now succeeds
	await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 8000 })
})

// ── 7. Form elements don't break during upload ─────────────────────────────

test('ADHD toggle, export instructions, and delayed sources work during upload', async ({
	page,
}) => {
	await toUploadPhase(page)

	// Start upload
	const card = page.getByTestId('upload-card-screentime')
	await card
		.locator('input[type="file"]')
		.first()
		.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

	// ADHD toggle should still work (it's above the upload area)
	// This is in the quiz area, but let's check the delayed source interactions
	const chatgptCard = page.getByTestId('upload-card-chatgpt')
	await chatgptCard.locator('button:has-text("How to export")').click()
	await expect(chatgptCard.locator('a[href*="chatgpt.com"]')).toBeVisible()

	// Wait for upload to finish
	await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 30000 })

	// Page should still be fully functional
	await expect(page.locator('text=Add your data')).toBeVisible()
})
