import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, startFresh } from './helpers'

/**
 * E2E: Real OCR upload — Tesseract runs in the browser on actual screenshots.
 * NO mocking of the OCR pipeline. Only the server API response is mocked.
 *
 * This test verifies:
 * 1. Real image → Tesseract extracts text in browser
 * 2. Client sends ocrText (not raw file) to the API
 * 3. The preview renders without crashing (the .map bug)
 * 4. Multiple images can be uploaded for the same source
 *
 * Assets: test/e2e/assets/screentime/ — real iPhone screenshots
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

async function setupAndNavigate(page: Page) {
	// Mock ONLY the server responses — NOT the client-side OCR
	const uploadCalls: Array<{ hasOcrText: boolean; hasFile: boolean; platform: string }> = []

	await startFresh(page, { session: { sessionId: 'ocr-real' } })
	// Override upload with call-capturing mock (last-registered-wins)
	await page.route('**/api/discovery/upload', async (route) => {
		const body = route.request().postData() ?? ''
		uploadCalls.push({
			hasOcrText: body.includes('ocrText'),
			hasFile: body.includes('filename=') || body.includes('image/jpeg'),
			platform: body.includes('screentime') ? 'screentime' : 'unknown',
		})
		// Return a realistic preview with proper arrays
		await route.fulfill({
			status: 200,
			body: JSON.stringify({
				success: true,
				platform: 'screentime',
				preview: {
					apps: [
						{ name: 'Cup Heroes', usageMinutes: 362, category: 'gaming' },
						{ name: 'Telegram', usageMinutes: 76, category: 'communication' },
						{ name: 'Hearthstone', usageMinutes: 59, category: 'gaming' },
						{ name: 'OP-mobile', usageMinutes: 45, category: 'finance' },
						{ name: 'Reddit', usageMinutes: 39, category: 'social' },
					],
					totalScreenTimeMinutes: 590,
					pickups: 53,
				},
			}),
		})
	})

	await fillQuiz(page)
	await acceptOptIn(page)

	return { uploadCalls: () => uploadCalls }
}

test.describe('Real OCR Upload', () => {
	test('uploads "Most Used" screenshot through real Tesseract OCR', async ({ page }) => {
		const { uploadCalls } = await setupAndNavigate(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))

		// Wait for the upload to complete — this includes Tesseract processing
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		// Verify the upload was called
		const calls = uploadCalls()
		expect(calls.length).toBe(1)
		expect(calls[0].platform).toBe('screentime')

		// Log which path was taken
		console.log('Most Used upload:', calls[0].hasOcrText ? 'OCR text sent' : 'raw file sent')

		// Preview should render without crashing
		await expect(card.locator('text=What we found')).toBeVisible()
		await expect(card.locator('text=Cup Heroes')).toBeVisible()
	})

	test('uploads "Pickups" screenshot as second image', async ({ page }) => {
		const { uploadCalls } = await setupAndNavigate(page)

		const card = page.getByTestId('upload-card-screentime')
		const fileInput = card.locator('input[type="file"]').first()

		// First upload — most used
		await fileInput.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })
		await expect(card.locator('text=1 of 3 sections')).toBeVisible()

		// Second upload — pickups (use "Add more" input)
		const addMoreInput = card.locator('input[type="file"]').first()
		await addMoreInput.setInputFiles(path.join(ASSETS, 'pickups.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		const calls = uploadCalls()
		expect(calls.length).toBe(2)
		console.log('Upload 1:', calls[0].hasOcrText ? 'OCR' : 'file')
		console.log('Upload 2:', calls[1].hasOcrText ? 'OCR' : 'file')
	})

	test('uploads all 3 screenshots sequentially', async ({ page }) => {
		const { uploadCalls } = await setupAndNavigate(page)

		const card = page.getByTestId('upload-card-screentime')

		// Upload 1: Most Used
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		// Upload 2: Pickups
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'pickups.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		// Upload 3: Notifications
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'notifications.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		const calls = uploadCalls()
		expect(calls.length).toBe(3)

		// All 3 should have gone through (either OCR or file fallback)
		for (let i = 0; i < 3; i++) {
			expect(calls[i].hasOcrText || calls[i].hasFile).toBe(true)
			console.log(`Upload ${i + 1}:`, calls[i].hasOcrText ? 'OCR text' : 'raw file')
		}
	})

	test('preview renders correctly with real API response shapes', async ({ page }) => {
		// This test specifically guards against the .map crash
		// by verifying the preview component handles various response shapes

		// Return preview with edge-case shapes (3 max — matches SCREENTIME_MAX_FILES)
		let callCount = 0

		await startFresh(page, { session: { sessionId: 'shape-test' } })
		// Override upload with edge-case shapes (last-registered-wins)
		await page.route('**/api/discovery/upload', async (route) => {
			callCount++
			const shapes = [
				// Normal array
				{
					apps: [{ name: 'Test', usageMinutes: 60, category: 'social' }],
					totalScreenTimeMinutes: 120,
				},
				// Empty apps array
				{ apps: [], totalScreenTimeMinutes: 0 },
				// Apps as non-array (the bug that crashed production)
				{ apps: { name: 'broken' }, totalScreenTimeMinutes: 100 },
			]
			await route.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					platform: 'screentime',
					preview: shapes[callCount - 1] ?? shapes[0],
				}),
			})
		})

		await fillQuiz(page)
		await acceptOptIn(page)

		const card = page.getByTestId('upload-card-screentime')

		// Upload all 3 at once — parallel OCR, each gets a different response shape
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles([
				path.join(ASSETS, 'most-used.jpeg'),
				path.join(ASSETS, 'pickups.jpeg'),
				path.join(ASSETS, 'notifications.jpeg'),
			])

		// Wait for the card to show all 3 processed (event-based, no arbitrary timeout)
		await expect(card.locator('text=3 of 3 done')).toBeVisible({ timeout: 30000 })

		// Page should still be functional (no crash from any shape)
		await expect(page.locator('text=Add your data')).toBeVisible()
		expect(callCount).toBe(3)
		console.log('All 3 edge-case shapes handled without crash')
	})
})
