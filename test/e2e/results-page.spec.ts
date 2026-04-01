import { expect, test, type Page } from '@playwright/test'

/**
 * E2E: Results phase rendering — verifies the AnalysisResults component
 * after completing quiz + skip.
 *
 * All APIs mocked. Mock analysis data uses the same shape as discovery-flow.spec.ts
 * but with realistic names for assertion clarity.
 */

const MOCK_ANALYSIS = {
	recommendedApp: {
		name: 'TimeGuard',
		description: 'A screen time awareness app',
		whyThisUser: 'You spend 5h/day on your phone',
		complexity: 'beginner' as const,
		estimatedBuildTime: '2h',
	},
	additionalApps: [
		{ name: 'BudgetBot', description: 'Tracks daily spending', whyThisUser: 'You mentioned money issues' },
		{ name: 'InboxZero', description: 'Email triage assistant', whyThisUser: 'Email is your top pain' },
	],
	learningModules: [
		{ id: 'mod-coding', title: "Coding in 2026 isn't scary", description: 'No CS degree needed.', locked: false },
		{ id: 'mod-prompts', title: '5 rules to level up your prompts', description: 'Stop getting generic answers.', locked: false },
		{ id: 'mod-claude', title: 'Claude Code: your co-pilot', description: 'Build real things.', locked: false },
		{ id: 'mod-setup', title: 'Your perfect app setup', description: 'Personalized.', locked: false },
	],
	keyInsights: [{ headline: 'Gaming dominates', detail: 'Cup Heroes 6h/day', source: 'screentime' }],
	dataProfile: { totalSourcesAnalyzed: 2, topProblemAreas: ['social', 'email'], aiUsageLevel: 'moderate' },
}

async function mockApis(page: Page) {
	await page.route('**/api/discovery/session', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'results-test' }) }),
	)
	await page.route('**/api/discovery/adaptive', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ followUps: [] }) }),
	)
	await page.route('**/api/discovery/analyze', (r) =>
		r.fulfill({
			status: 200,
			body: JSON.stringify({
				success: true,
				sessionId: 'results-test',
				analysis: MOCK_ANALYSIS,
			}),
		}),
	)
	await page.route('**/api/subscribe', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
	)
	await page.route('**/api/billing/checkout', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ url: null }) }),
	)
}

async function navigateToResults(page: Page) {
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

	// Skip upload to trigger analysis
	await page.getByTestId('skip-button').click()

	// Wait for results — BudgetBot is the visible card (position=second, index=1)
	await page.locator('text=BudgetBot').waitFor({ state: 'visible', timeout: 20000 })
}

test.describe('Results Page', () => {
	test('results header is visible with source count', async ({ page }) => {
		await navigateToResults(page)
		await expect(page.locator('text=what we found')).toBeVisible()
		// Header mentions source count from mock
		await expect(page.locator('text=2 sources')).toBeVisible()
	})

	test('visible recommendation card shows BudgetBot (second position)', async ({ page }) => {
		await navigateToResults(page)
		// BudgetBot is the second app — the only one not blurred
		await expect(page.locator('text=BudgetBot')).toBeVisible()
		await expect(page.locator('text=Tracks daily spending')).toBeVisible()
		await expect(page.locator('text=You mentioned money issues')).toBeVisible()
	})

	test('locked/blurred cards show unlock overlay', async ({ page }) => {
		await navigateToResults(page)
		// LockedRecommendationCard renders blur overlay with "Unlock to see your #1 recommendation"
		// and "Unlock to see your #3 recommendation" for first/third positions
		await expect(page.locator('text=Unlock to see your #1 recommendation')).toBeVisible()
		await expect(page.locator('text=Unlock to see your #3 recommendation')).toBeVisible()
	})

	test('learning modules are visible with titles', async ({ page }) => {
		await navigateToResults(page)
		// Check for module titles from mock data (or default modules)
		await expect(page.locator("text=Coding in 2026 isn't scary")).toBeVisible()
		await expect(page.locator('text=5 rules to level up your prompts')).toBeVisible()
		await expect(page.locator('text=Claude Code: your co-pilot')).toBeVisible()
		await expect(page.locator('text=Your perfect app setup')).toBeVisible()
	})

	test('paywall section shows EUR 29 and EUR 79 tiers', async ({ page }) => {
		await navigateToResults(page)
		await expect(page.locator('text=EUR 29').first()).toBeVisible()
		await expect(page.locator('text=EUR 79').first()).toBeVisible()
	})

	test('share button is visible', async ({ page }) => {
		await navigateToResults(page)
		await expect(page.locator('button:has-text("Share results")')).toBeVisible()
	})

	test('"Start over" button returns to quiz', async ({ page }) => {
		await navigateToResults(page)
		await page.locator('button:has-text("Start over")').click()
		await page.locator('text=What do you do?').waitFor({ state: 'visible', timeout: 10000 })
	})
})
