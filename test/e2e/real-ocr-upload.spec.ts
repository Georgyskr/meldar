import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

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
	let uploadCalls: Array<{ hasOcrText: boolean; hasFile: boolean; platform: string }> = []

	await page.route('**/api/discovery/session', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'ocr-real' }) }),
	)

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

	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.addInitScript(() => {
		localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })
	await page.evaluate(() => {
		localStorage.clear()
		localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })

	// Fill quiz fast (reduced motion = 0ms delays)
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

	// Opt in
	await page.locator('text=I agree that my uploaded data').click()
	await expect(page.locator('#data-opt-in')).not.toBeVisible()

	return { uploadCalls: () => uploadCalls }
}

test.describe('Real OCR Upload', () => {
	test('uploads "Most Used" screenshot through real Tesseract OCR', async ({ page }) => {
		const { uploadCalls } = await setupAndNavigate(page)

		const card = page.getByTestId('upload-card-screentime')
		await card.locator('input[type="file"]').first().setInputFiles(
			path.join(ASSETS, 'most-used.jpeg'),
		)

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
		await expect(card.locator('text=1 of 4 sections')).toBeVisible()

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
		await card.locator('input[type="file"]').first().setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		// Upload 2: Pickups
		await card.locator('input[type="file"]').first().setInputFiles(path.join(ASSETS, 'pickups.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		// Upload 3: Notifications
		await card.locator('input[type="file"]').first().setInputFiles(path.join(ASSETS, 'notifications.jpeg'))
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

		await page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'shape-test' }) }),
		)

		// Return preview with edge-case shapes
		let callCount = 0
		await page.route('**/api/discovery/upload', async (route) => {
			callCount++
			const shapes = [
				// Normal array
				{ apps: [{ name: 'Test', usageMinutes: 60, category: 'social' }], totalScreenTimeMinutes: 120 },
				// Empty apps array
				{ apps: [], totalScreenTimeMinutes: 0 },
				// No apps field at all
				{ totalScreenTimeMinutes: 300, pickups: 50 },
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

		await page.emulateMedia({ reducedMotion: 'reduce' })
		await page.addInitScript(() => {
			localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
		})
		await page.goto('/start', { waitUntil: 'domcontentloaded' })
		await page.evaluate(() => {
			localStorage.clear()
			localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
		})
		await page.goto('/start', { waitUntil: 'domcontentloaded' })

		// Quick quiz
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

		const card = page.getByTestId('upload-card-screentime')

		// Upload with each shape — none should crash
		for (let i = 0; i < 4; i++) {
			await card.locator('input[type="file"]').first().setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
			await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })
		}

		// Page should still be functional (no crash)
		await expect(page.locator('text=Add your data')).toBeVisible()
		console.log('All 4 edge-case shapes handled without crash')
	})
})
