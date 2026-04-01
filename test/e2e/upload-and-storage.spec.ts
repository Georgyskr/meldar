import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: Upload flow, OCR, opt-in, storage persistence.
 * Full end-to-end — starts from /start, fills quiz, reaches upload phase.
 * No localStorage injection. No hacks.
 */

const FIXTURES = path.resolve(__dirname, '../fixtures/screentime')

function mockApis(page: Page) {
	return Promise.all([
		page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'e2e-upload' }) }),
		),
		page.route('**/api/discovery/upload', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify({
					success: true,
					platform: 'screentime',
					preview: {
						apps: [
							{ name: 'Cup Heroes', usageMinutes: 382, category: 'gaming' },
							{ name: 'Safari', usageMinutes: 36, category: 'browser' },
						],
						totalScreenTimeMinutes: 590,
						pickups: 33,
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
					sessionId: 'e2e-upload',
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

/** Fill the 5-step quiz and land on upload phase — real clicks, no shortcuts */
async function fillQuizToUpload(page: Page) {
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

async function startFresh(page: Page) {
	await mockApis(page)
	await page.addInitScript(() => {
		localStorage.clear()
		localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })
}

// ── Opt-in ─────────────────────────────────────────────────────────────────

test.describe('Opt-in', () => {
	test('checkbox visible with Privacy + ToS links before upload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await expect(page.locator('#data-opt-in')).toBeVisible()
		await expect(page.locator('a[href="/privacy-policy"]').first()).toBeVisible()
		await expect(page.locator('a[href="/terms"]').first()).toBeVisible()
	})

	test('upload blocked before opt-in', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		const fileInput = page.getByTestId('upload-card-screentime').locator('input[type="file"]')
		await fileInput.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		// handleFile returns early when !optedIn — no "Analyzed" badge
		await expect(page.locator('text=Analyzed')).not.toBeVisible()
	})

	test('checking opt-in hides the checkbox', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()
		await expect(page.locator('#data-opt-in')).not.toBeVisible()
	})
})

// ── Upload ─────────────────────────────────────────────────────────────────

test.describe('Upload', () => {
	test('screenshot shows done + preview after upload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()

		const card = page.getByTestId('upload-card-screentime')
		await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await expect(card.locator('text=Analyzed')).toBeVisible({ timeout: 8000 })
		await expect(card.locator('text=What we found')).toBeVisible()
		await expect(card.locator('text=Cup Heroes')).toBeVisible()
	})

	test('Screen Time shows "Add more" for multi-upload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()

		const card = page.getByTestId('upload-card-screentime')
		await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await expect(card.locator('text=Analyzed')).toBeVisible({ timeout: 8000 })
		await expect(card.locator('text=Add more')).toBeVisible()
	})

	test('"Generate results" enables after upload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await expect(page.getByTestId('generate-results-button')).toBeDisabled()

		await page.locator('#data-opt-in').check()
		const card = page.getByTestId('upload-card-screentime')
		await card.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await expect(card.locator('text=Analyzed')).toBeVisible({ timeout: 8000 })
		await expect(page.getByTestId('generate-results-button')).toBeEnabled()
	})
})

// ── OCR ────────────────────────────────────────────────────────────────────

test.describe('OCR', () => {
	test('upload sends ocrText or file (Tesseract or fallback)', async ({ page }) => {
		let hasOcrText = false
		let hasFile = false

		await page.route('**/api/discovery/upload', async (route) => {
			const body = route.request().postData() ?? ''
			hasOcrText = body.includes('ocrText')
			hasFile = body.includes('filename=') || body.includes('image/')
			await route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true, platform: 'screentime', preview: { apps: [] } }),
			})
		})
		await page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'ocr' }) }),
		)
		await page.addInitScript(() => {
			localStorage.clear()
			localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }))
		})
		await page.goto('/start', { waitUntil: 'domcontentloaded' })
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()

		await page.getByTestId('upload-card-screentime').locator('input[type="file"]').setInputFiles(
			path.join(FIXTURES, '02-app-list-pickups.jpeg'),
		)
		// Wait for the upload round-trip
		await page.waitForResponse('**/api/discovery/upload', { timeout: 8000 })

		expect(hasOcrText || hasFile).toBe(true)
		console.log('OCR:', hasOcrText ? 'Tesseract text sent' : 'Vision fallback (file sent)')
	})
})

// ── Storage ────────────────────────────────────────────────────────────────

test.describe('Storage', () => {
	test('profile data in localStorage after quiz', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)

		const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('meldar-profile') ?? 'null'))
		expect(profile).not.toBeNull()
		expect(profile.occupation).toBe('working')
		expect(profile.ageBracket).toBe('26-30')
		expect(profile.aiToolsUsed).toContain('chatgpt')
	})

	test('sessionId null after quiz (lazy creation)', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)

		const sid = await page.evaluate(() => JSON.parse(localStorage.getItem('meldar-session-id') ?? 'null'))
		expect(sid).toBeNull()
	})

	test('sessionId set after first upload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()

		await page.getByTestId('upload-card-screentime').locator('input[type="file"]').setInputFiles(
			path.join(FIXTURES, '01-usage-chart.jpeg'),
		)
		await page.locator('text=Analyzed').first().waitFor({ timeout: 8000 })

		const sid = await page.evaluate(() => JSON.parse(localStorage.getItem('meldar-session-id') ?? 'null'))
		expect(sid).toBe('e2e-upload')
	})

	test('upload status survives reload', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('#data-opt-in').check()

		await page.getByTestId('upload-card-screentime').locator('input[type="file"]').setInputFiles(
			path.join(FIXTURES, '01-usage-chart.jpeg'),
		)
		await page.locator('text=Analyzed').first().waitFor({ timeout: 8000 })

		await page.reload()
		await page.locator('text=Add your data').waitFor({ timeout: 8000 })
		await expect(page.getByTestId('upload-card-screentime').locator('text=Analyzed')).toBeVisible()
	})
})

// ── Card UI ────────────────────────────────────────────────────────────────

test.describe('Card UI', () => {
	test('"How to export" toggles instructions', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('button:has-text("How to export")').first().click()
		await expect(page.locator('text=Settings').first()).toBeVisible()
	})

	test('delayed source shows "I started the export" → waiting state', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.locator('text=I started the export').first().click()
		await expect(page.locator('text=Waiting')).toBeVisible()
	})

	test('ChatGPT card has hyperlink to export page', async ({ page }) => {
		await startFresh(page)
		await fillQuizToUpload(page)
		await page.getByTestId('upload-card-chatgpt').locator('button:has-text("How to export")').click()
		await expect(page.locator('a[href*="chatgpt.com"]')).toBeVisible()
	})
})
