import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, fillQuiz, mockDiscoveryApis } from './helpers'

/**
 * E2E: Upload flow, OCR, opt-in, storage persistence.
 * Full end-to-end — starts from /start, fills quiz, reaches upload phase.
 * Uses serial mode to fill the quiz once and reuse the session for all tests.
 */

const FIXTURES = path.resolve(__dirname, '../fixtures/screentime')

const UPLOAD_OVERRIDES = {
	session: { sessionId: 'e2e-upload' },
	upload: {
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
	},
}

/**
 * Uses double-navigate pattern so reloads preserve localStorage state.
 * This differs from the shared startFresh (addInitScript once-guard).
 */
async function startFresh(page: Page) {
	await mockDiscoveryApis(page, UPLOAD_OVERRIDES)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	// Set cookie consent on every navigation (needed for banner dismiss)
	await page.addInitScript(() => {
		if (!localStorage.getItem('cookie-consent')) {
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
		}
	})
	// Clear once before first navigation — don't use addInitScript so reloads preserve state
	await page.goto('/start', { waitUntil: 'domcontentloaded' })
	await page.evaluate(() => {
		localStorage.clear()
		localStorage.setItem(
			'cookie-consent',
			JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
		)
	})
	await page.goto('/start', { waitUntil: 'domcontentloaded' })
}

// ── Opt-in ─────────────────────────────────────────────────────────────────

test.describe('Data Terms', () => {
	test('terms block visible with Privacy + ToS links before upload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await expect(page.locator('#data-terms')).toBeVisible()
		await expect(page.locator('a[href="/privacy-policy"]').first()).toBeVisible()
		await expect(page.locator('a[href="/terms"]').first()).toBeVisible()
	})

	test('upload cards are disabled before accepting terms', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		const card = page.getByTestId('upload-card-screentime')
		const opacity = await card.evaluate((el) => {
			const child = el.firstElementChild
			if (!child) throw new Error('upload card has no child element')
			return getComputedStyle(child).opacity
		})
		expect(Number.parseFloat(opacity)).toBeLessThan(1)
	})

	test('accepting terms shows acceptance pill and enables uploads', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await page.locator('button:has-text("I agree, let me upload")').click()
		await expect(page.locator('text=Data terms accepted')).toBeVisible()
		await expect(page.locator('#data-terms')).not.toBeVisible()
	})
})

// ── Upload ─────────────────────────────────────────────────────────────────

test.describe('Upload', () => {
	test('screenshot shows done + preview after upload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		// Screen Time has maxFiles=3, so first upload shows "1 of 3" partial state, not "Analyzed"
		await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 8000 })
		await expect(card.locator('text=What we found')).toBeVisible()
		await expect(card.locator('text=Cup Heroes')).toBeVisible()
	})

	test('Screen Time shows "Add more" for multi-upload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)

		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 8000 })
		await expect(card.locator('text=Add more')).toBeVisible()
	})

	test('"Generate results" enables after upload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await expect(page.getByTestId('generate-results-button')).toBeDisabled()

		await acceptOptIn(page)
		const card = page.getByTestId('upload-card-screentime')
		await card
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await expect(card.locator('text=1 of 3 sections')).toBeVisible({ timeout: 8000 })
		await expect(page.getByTestId('generate-results-button')).toBeEnabled()
	})
})

// ── OCR ────────────────────────────────────────────────────────────────────

test.describe('OCR', () => {
	test('upload sends ocrText or file (Tesseract or fallback)', async ({ page }) => {
		let hasOcrText = false
		let hasFile = false

		await mockDiscoveryApis(page, { session: { sessionId: 'ocr' } })
		await page.emulateMedia({ reducedMotion: 'reduce' })
		// Override upload with body-inspecting mock (last-registered-wins)
		await page.route('**/api/discovery/upload', async (route) => {
			const body = route.request().postData() ?? ''
			hasOcrText = body.includes('ocrText')
			hasFile = body.includes('filename=') || body.includes('image/')
			await route.fulfill({
				status: 200,
				body: JSON.stringify({ success: true, platform: 'screentime', preview: { apps: [] } }),
			})
		})
		await page.addInitScript(() => {
			localStorage.clear()
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
		})
		await page.goto('/start', { waitUntil: 'domcontentloaded' })
		await fillQuiz(page)
		await acceptOptIn(page)

		await page
			.getByTestId('upload-card-screentime')
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '02-app-list-pickups.jpeg'))
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
		await fillQuiz(page)

		const profile = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('meldar-profile') ?? 'null'),
		)
		expect(profile).not.toBeNull()
		expect(profile.occupation).toBe('working')
		expect(profile.ageBracket).toBe('26-30')
		expect(profile.aiToolsUsed).toContain('chatgpt')
	})

	test('sessionId null after quiz (lazy creation)', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)

		const sid = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('meldar-session-id') ?? 'null'),
		)
		expect(sid).toBeNull()
	})

	test('sessionId set after first upload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)

		await page
			.getByTestId('upload-card-screentime')
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await page.locator('text=1 of 3 sections').first().waitFor({ timeout: 8000 })

		const sid = await page.evaluate(() =>
			JSON.parse(localStorage.getItem('meldar-session-id') ?? 'null'),
		)
		expect(sid).toBe('e2e-upload')
	})

	test('upload status survives reload', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)

		await page
			.getByTestId('upload-card-screentime')
			.locator('input[type="file"]')
			.setInputFiles(path.join(FIXTURES, '01-usage-chart.jpeg'))
		await page.locator('text=1 of 3 sections').first().waitFor({ timeout: 8000 })

		await page.reload()
		await page.locator('text=Add your data').waitFor({ timeout: 8000 })
		await expect(
			page.getByTestId('upload-card-screentime').locator('text=1 of 3 sections'),
		).toBeVisible()
	})
})

// ── Card UI ────────────────────────────────────────────────────────────────

test.describe('Card UI', () => {
	test('"How to export" toggles instructions', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)
		await page.locator('button:has-text("How to export")').first().click()
		await expect(page.locator('text=Settings').first()).toBeVisible()
	})

	test('delayed source shows "I started the export" → waiting state', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)
		await page.locator('text=I started the export').first().click()
		await expect(page.locator('text=Waiting')).toBeVisible()
	})

	test('ChatGPT card has hyperlink to export page', async ({ page }) => {
		await startFresh(page)
		await fillQuiz(page)
		await acceptOptIn(page)
		await page
			.getByTestId('upload-card-chatgpt')
			.locator('button:has-text("How to export")')
			.click()
		await expect(page.locator('a[href*="chatgpt.com"]')).toBeVisible()
	})
})
