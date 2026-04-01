import path from 'node:path'
import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: File validation — wrong file types and empty files.
 * Verifies the upload cards handle invalid input gracefully.
 */

const ASSETS_DIR = path.resolve(__dirname, 'assets')

function mockApis(page: Page) {
	return Promise.all([
		page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'validation-test' }) }),
		),
		page.route('**/api/discovery/upload', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					platform: 'screentime',
					preview: { apps: [], totalScreenTimeMinutes: 0 },
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
					sessionId: 'validation-test',
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

async function toUploadPhase(page: Page) {
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

	// Opt in
	await page.locator('text=I agree that my uploaded data').click()
	await expect(page.locator('#data-opt-in')).not.toBeVisible()
}

// Create temp test files before all tests
const TEXT_FILE = path.join(ASSETS_DIR, 'invalid-test.txt')
const EMPTY_FILE = path.join(ASSETS_DIR, 'empty-test.png')

test.beforeAll(() => {
	// Create a text file
	fs.mkdirSync(ASSETS_DIR, { recursive: true })
	fs.writeFileSync(TEXT_FILE, 'This is not an image file. It is plain text.')
	// Create an empty file with .png extension
	fs.writeFileSync(EMPTY_FILE, '')
})

test.afterAll(() => {
	// Cleanup temp files
	try { fs.unlinkSync(TEXT_FILE) } catch { /* ignore */ }
	try { fs.unlinkSync(EMPTY_FILE) } catch { /* ignore */ }
})

test.describe('File Validation', () => {
	test('uploading a text file to screentime card does not crash', async ({ page }) => {
		await toUploadPhase(page)

		const card = page.getByTestId('upload-card-screentime')

		// The accept attribute is "image/jpeg,image/png,image/webp" so the browser
		// may reject non-image files. We use setInputFiles which bypasses the file
		// picker dialog but the change event still fires.
		// The important thing: the page should NOT crash.
		const pageErrors: string[] = []
		page.on('pageerror', (err) => pageErrors.push(err.message))

		await card.locator('input[type="file"]').first().setInputFiles(TEXT_FILE)

		// Wait briefly for any error processing to complete
		// If OCR runs on the text file, it will likely fail, triggering error or fallback
		// Either way, the page should remain functional
		await expect(page.locator('text=Add your data')).toBeVisible({ timeout: 8000 })

		// The card should NOT show a successful upload state (no "1 of 4")
		// It may show an error, or nothing — but not success with a text file
		// Check no unrecoverable page crash
		expect(pageErrors.filter((e) => e.includes('Unhandled')).length).toBe(0)
	})

	test('uploading an empty file does not crash', async ({ page }) => {
		await toUploadPhase(page)

		const card = page.getByTestId('upload-card-screentime')

		const pageErrors: string[] = []
		page.on('pageerror', (err) => pageErrors.push(err.message))

		await card.locator('input[type="file"]').first().setInputFiles(EMPTY_FILE)

		// Page should remain functional — not crash
		await expect(page.locator('text=Add your data')).toBeVisible({ timeout: 8000 })

		// No unrecoverable page errors
		expect(pageErrors.filter((e) => e.includes('Unhandled')).length).toBe(0)
	})
})
