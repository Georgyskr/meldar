import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, startFresh } from './helpers'

/**
 * E2E: OCR output quality — verify Tesseract extracts correct text
 * from real iPhone Screen Time screenshots.
 *
 * Strategy: intercept the /api/discovery/upload route, capture the
 * FormData body, and assert the ocrText field contains expected
 * substrings. If Tesseract fails (empty ocrText), the file fallback
 * is acceptable — assert the raw file was sent instead.
 */

const ASSETS = path.resolve(__dirname, 'assets/screentime')

async function setupAndNavigateToUpload(page: Page): Promise<{
	getCapturedBodies: () => string[]
}> {
	const capturedBodies: string[] = []

	await startFresh(page, { session: { sessionId: 'ocr-quality' } })
	// Override upload with body-capturing mock (last-registered-wins)
	await page.route('**/api/discovery/upload', async (route) => {
		const body = route.request().postData() ?? ''
		capturedBodies.push(body)
		await route.fulfill({
			status: 200,
			body: JSON.stringify({
				success: true,
				platform: 'screentime',
				preview: {
					apps: [{ name: 'TestApp', usageMinutes: 60, category: 'social' }],
					totalScreenTimeMinutes: 120,
				},
			}),
		})
	})

	await fillQuiz(page)
	await acceptOptIn(page)

	return { getCapturedBodies: () => capturedBodies }
}

/**
 * Extract ocrText value from a multipart/form-data body string.
 * The ocrText field is embedded as: ...name="ocrText"\r\n\r\n<value>\r\n...
 */
function extractOcrText(body: string): string | null {
	const match = body.match(/name="ocrText"\r?\n\r?\n([\s\S]*?)(?:\r?\n--|--)/)
	return match?.[1]?.trim() ?? null
}

test.describe('OCR Quality: most-used.jpeg', () => {
	test('ocrText contains "Cup Heroes" or file fallback is sent', async ({ page }) => {
		const { getCapturedBodies } = await setupAndNavigateToUpload(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'most-used.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		const bodies = getCapturedBodies()
		expect(bodies.length).toBe(1)

		const ocrText = extractOcrText(bodies[0])
		const hasFile = bodies[0].includes('filename=') || bodies[0].includes('image/')

		if (ocrText && ocrText.length > 0) {
			// Tesseract succeeded — verify quality
			console.log('OCR text (most-used):', ocrText.slice(0, 200))
			expect(ocrText.toLowerCase()).toContain('cup heroes')
		} else {
			// Tesseract failed — Vision fallback is acceptable
			console.log('Tesseract failed for most-used.jpeg, file fallback used')
			expect(hasFile).toBe(true)
		}
	})
})

test.describe('OCR Quality: pickups.jpeg', () => {
	test('ocrText contains pickup-related text or file fallback is sent', async ({ page }) => {
		const { getCapturedBodies } = await setupAndNavigateToUpload(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'pickups.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		const bodies = getCapturedBodies()
		expect(bodies.length).toBe(1)

		const ocrText = extractOcrText(bodies[0])
		const hasFile = bodies[0].includes('filename=') || bodies[0].includes('image/')

		if (ocrText && ocrText.length > 0) {
			console.log('OCR text (pickups):', ocrText.slice(0, 200))
			const lowerText = ocrText.toLowerCase()
			const hasExpected =
				lowerText.includes('pickup') || lowerText.includes('53') || lowerText.includes('telegram')
			expect(hasExpected).toBe(true)
		} else {
			console.log('Tesseract failed for pickups.jpeg, file fallback used')
			expect(hasFile).toBe(true)
		}
	})
})

test.describe('OCR Quality: notifications.jpeg', () => {
	test('ocrText contains notification-related text or file fallback is sent', async ({ page }) => {
		const { getCapturedBodies } = await setupAndNavigateToUpload(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.first()
			.setInputFiles(path.join(ASSETS, 'notifications.jpeg'))
		await page.waitForResponse('**/api/discovery/upload', { timeout: 30000 })

		const bodies = getCapturedBodies()
		expect(bodies.length).toBe(1)

		const ocrText = extractOcrText(bodies[0])
		const hasFile = bodies[0].includes('filename=') || bodies[0].includes('image/')

		if (ocrText && ocrText.length > 0) {
			console.log('OCR text (notifications):', ocrText.slice(0, 200))
			const lowerText = ocrText.toLowerCase()
			const hasExpected =
				lowerText.includes('notification') ||
				lowerText.includes('347') ||
				lowerText.includes('telegram')
			expect(hasExpected).toBe(true)
		} else {
			console.log('Tesseract failed for notifications.jpeg, file fallback used')
			expect(hasFile).toBe(true)
		}
	})
})
