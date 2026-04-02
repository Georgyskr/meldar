import { expect, type Page } from '@playwright/test'

// ── Default mock response bodies ──────────────────────────────────────────

const DEFAULT_SESSION_RESPONSE = { sessionId: 'e2e-sess' }

const DEFAULT_UPLOAD_RESPONSE = {
	success: true,
	platform: 'screentime',
	preview: {
		apps: [{ name: 'Cup Heroes', usageMinutes: 362, category: 'gaming' }],
		totalScreenTimeMinutes: 590,
		pickups: 53,
	},
}

const DEFAULT_ADAPTIVE_RESPONSE = { followUps: [] }

const DEFAULT_ANALYZE_RESPONSE = {
	success: true,
	sessionId: 'e2e-sess',
	analysis: {
		recommendedApp: {
			name: 'A1',
			description: 'd',
			whyThisUser: 'w',
			complexity: 'beginner',
			estimatedBuildTime: '1h',
		},
		additionalApps: [{ name: 'A2', description: 'd', whyThisUser: 'w' }],
		learningModules: [{ id: 'm', title: 'M', description: 'd', locked: false }],
		keyInsights: [{ headline: 'h', detail: 'd', source: 's' }],
		dataProfile: { totalSourcesAnalyzed: 1, topProblemAreas: ['x'], aiUsageLevel: 'l' },
	},
}

// ── Mock API setup ────────────────────────────────────────────────────────

export interface MockOverrides {
	session?: unknown
	upload?: unknown
	adaptive?: unknown
	analyze?: unknown
}

/**
 * Register route mocks for all four discovery API endpoints.
 * Overrides merge with defaults per-endpoint.
 *
 * NOTE: Playwright uses last-registered-wins for route matching, so callers
 * can register additional routes AFTER this function to override specific
 * endpoints (e.g. error responses, counting calls).
 */
export async function mockDiscoveryApis(page: Page, overrides?: MockOverrides) {
	await Promise.all([
		page.route('**/api/discovery/session', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify(overrides?.session ?? DEFAULT_SESSION_RESPONSE),
			}),
		),
		page.route('**/api/discovery/upload', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify(overrides?.upload ?? DEFAULT_UPLOAD_RESPONSE),
			}),
		),
		page.route('**/api/discovery/adaptive', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify(overrides?.adaptive ?? DEFAULT_ADAPTIVE_RESPONSE),
			}),
		),
		page.route('**/api/discovery/analyze', (r) =>
			r.fulfill({
				status: 200,
				body: JSON.stringify(overrides?.analyze ?? DEFAULT_ANALYZE_RESPONSE),
			}),
		),
	])
}

// ── Quiz navigation ───────────────────────────────────────────────────────

/**
 * Click through all 5 quiz steps with default answers.
 * Assumes the page is already on /start with "What do you do?" visible.
 */
export async function fillQuiz(page: Page) {
	await page.locator('text=What do you do?').waitFor({ timeout: 15000 })
	await page.locator('button:has-text("Working")').click()
	await page.locator('text=How old are you?').waitFor({ timeout: 15000 })
	await page.locator('button:has-text("26-30")').click()
	await page.locator('text=What bugs you most?').waitFor({ timeout: 15000 })
	await page.locator('button:has-text("Email")').click()
	await page.locator('button:has-text("dinner")').click()
	await page.getByTestId('lock-button').click()
	await page.locator('text=How AI-savvy').waitFor({ timeout: 15000 })
	await page.locator('button:has-text("A few times")').click()
	await page.locator('text=Which AI tools').waitFor({ timeout: 15000 })
	await page.locator('button:has-text("ChatGPT")').click()
	await page.getByTestId('lock-button').click()
	await page.locator('text=Add your data').waitFor({ timeout: 15000 })
}

// ── Opt-in ────────────────────────────────────────────────────────────────

/**
 * Click the data opt-in checkbox and wait for it to disappear.
 */
export async function acceptOptIn(page: Page) {
	await page.locator('text=I agree that my uploaded data').click()
	await expect(page.locator('#data-opt-in')).not.toBeVisible()
}

// ── Full page setup ───────────────────────────────────────────────────────

/**
 * Navigate to /start with clean localStorage, cookie consent pre-set,
 * reduced motion, and all discovery APIs mocked.
 */
export async function startFresh(page: Page, overrides?: MockOverrides) {
	await mockDiscoveryApis(page, overrides)
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
}

// ── Composite: setup → quiz → opt-in ──────────────────────────────────────

/**
 * Full setup: startFresh + fillQuiz + acceptOptIn.
 * Lands the page on the upload phase, ready for file uploads.
 */
export async function toUploadPhase(page: Page, overrides?: MockOverrides) {
	await startFresh(page, overrides)
	await fillQuiz(page)
	await acceptOptIn(page)
}
