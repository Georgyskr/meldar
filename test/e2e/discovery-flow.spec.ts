import { expect, type Page, test } from '@playwright/test'
import { acceptOptIn, startFresh as startFreshShared } from './helpers'

/**
 * E2E: /start discovery flow — QuickProfile + DataUploadHub.
 * All APIs mocked. No real Anthropic/DB calls.
 */

// ── Constants ──────────────────────────────────────────────────────────────

const STEP_LABELS = {
	occupation: 'What do you do?',
	age: 'How old are you?',
	pain: 'What bugs you most?',
	aiComfort: 'How AI-savvy',
	aiTools: 'Which AI tools',
	upload: 'Add your data',
} as const

// ── Mock overrides specific to this file ──────────────────────────────────

const DISCOVERY_FLOW_OVERRIDES = {
	session: { sessionId: 'e2e-sess' },
	upload: {
		success: true,
		platform: 'screentime',
		preview: {
			apps: [{ name: 'Instagram', usageMinutes: 120, category: 'social' }],
			totalScreenTimeMinutes: 480,
		},
	},
	analyze: {
		success: true,
		sessionId: 'e2e-sess',
		analysis: {
			recommendedApp: {
				name: 'TestApp',
				description: 'Screen time tracker app',
				whyThisUser: 'You spend 2h/day on Instagram',
				complexity: 'beginner',
				estimatedBuildTime: '1h',
			},
			additionalApps: [
				{ name: 'App2', description: 'Budget tracker', whyThisUser: 'Tracks spending' },
				{ name: 'App3', description: 'Email digest', whyThisUser: 'Reduces inbox time' },
			],
			learningModules: [
				{ id: 'm1', title: 'Mod1', description: 'Introduction', locked: false },
				{ id: 'm2', title: 'Mod2', description: 'Basics', locked: false },
				{ id: 'm3', title: 'Mod3', description: 'Advanced', locked: false },
				{ id: 'm4', title: 'Mod4', description: 'Expert', locked: false },
			],
			keyInsights: [{ headline: 'Top insight', detail: 'Detail text', source: 'screentime' }],
			dataProfile: {
				totalSourcesAnalyzed: 1,
				topProblemAreas: ['social'],
				aiUsageLevel: 'low',
			},
		},
	},
}

// ── Page setup ─────────────────────────────────────────────────────────────

async function startFresh(page: Page) {
	await startFreshShared(page, DISCOVERY_FLOW_OVERRIDES)
	// Extra route for this file's subscribe endpoint
	await page.route('**/api/subscribe', (r) =>
		r.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
	)
	await page.locator(`text=${STEP_LABELS.occupation}`).waitFor({ timeout: 10000 })
}

// ── Step helpers ───────────────────────────────────────────────────────────

/** Click an option button by partial text match */
async function selectOption(page: Page, text: string) {
	await page.locator(`button:has-text("${text}")`).first().click()
}

/** Wait for a step heading to become visible */
async function waitForStep(page: Page, stepText: string) {
	await page.locator(`text=${stepText}`).waitFor({ state: 'visible', timeout: 10000 })
}

async function completeOccupation(page: Page, pick = 'Working') {
	await selectOption(page, pick)
	await waitForStep(page, STEP_LABELS.age)
}

async function completeAge(page: Page, pick = '26-30') {
	await selectOption(page, pick)
	await waitForStep(page, STEP_LABELS.pain)
}

async function completePainPoints(page: Page, picks = ['Email', 'Posting to every']) {
	for (const pick of picks) {
		await page.locator(`button:has-text("${pick}")`).click()
	}
	await page.getByTestId('lock-button').click()
	await waitForStep(page, STEP_LABELS.aiComfort)
}

async function completeAiComfort(page: Page, pick = 'A few times') {
	await page.locator(`button:has-text("${pick}")`).click()
	await waitForStep(page, STEP_LABELS.aiTools)
}

async function completeAiTools(page: Page, picks = ['ChatGPT']) {
	for (const pick of picks) {
		await selectOption(page, pick)
	}
	await page.getByTestId('lock-button').click()
	await page.locator(`text=${STEP_LABELS.upload}`).waitFor({ state: 'visible', timeout: 10000 })
}

/** Complete all 5 profile steps */
async function completeProfile(page: Page) {
	await completeOccupation(page)
	await completeAge(page)
	await completePainPoints(page)
	await completeAiComfort(page)
	await completeAiTools(page)
}

// ── Step 1: Occupation ─────────────────────────────────────────────────────

test.describe('Step 1: Occupation', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
	})

	test('step counter and all occupation options are visible on load', async ({ page }) => {
		await expect(page.getByTestId('step-counter')).toBeVisible()
		await expect(page.getByTestId('step-prompt')).toBeVisible()
		await expect(page.getByTestId('option-student')).toBeVisible()
		await expect(page.getByTestId('option-working')).toBeVisible()
		await expect(page.getByTestId('option-freelance')).toBeVisible()
		await expect(page.getByTestId('option-job-hunting')).toBeVisible()
		await expect(page.getByTestId('option-creator')).toBeVisible()
		await expect(page.getByTestId('option-something-else')).toBeVisible()
	})

	test('slot board displays all 5 slot labels', async ({ page }) => {
		for (const id of ['occupation', 'age', 'pain', 'comfort', 'tools']) {
			await expect(page.getByTestId(`slot-label-${id}`)).toBeVisible()
		}
	})

	test('selecting an occupation advances to step 2', async ({ page }) => {
		await selectOption(page, 'Student')
		await waitForStep(page, STEP_LABELS.age)
		await expect(page.getByTestId('step-counter')).toContainText('Step 2 of 5')
	})

	test('"Something else" opens input and Enter submits custom value', async ({ page }) => {
		await page.getByTestId('option-something-else').click()
		const input = page.locator('input[placeholder*="Type your answer"]')
		await expect(input).toBeVisible()
		await input.fill('Digital nomad')
		await input.press('Enter')
		await waitForStep(page, STEP_LABELS.age)
	})

	test('"Something else" submits custom value via Lock in button', async ({ page }) => {
		await page.getByTestId('option-something-else').click()
		const input = page.locator('input[placeholder*="Type your answer"]')
		await input.fill('Parent')
		await page.locator('button:has-text("Lock in")').click()
		await waitForStep(page, STEP_LABELS.age)
	})
})

// ── Step 2: Age ────────────────────────────────────────────────────────────

test.describe('Step 2: Age', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
		await completeOccupation(page)
	})

	test('all age options are visible', async ({ page }) => {
		for (const age of ['16-20', '21-25', '26-30', '31+']) {
			await expect(page.locator(`button:has-text("${age}")`)).toBeVisible()
		}
	})

	test('selecting an age advances to pain points', async ({ page }) => {
		await selectOption(page, '21-25')
		await waitForStep(page, STEP_LABELS.pain)
		await expect(page.getByTestId('step-counter')).toContainText('Step 3 of 5')
	})
})

// ── Step 3: Pain Points ────────────────────────────────────────────────────

test.describe('Step 3: Pain Points', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
		await completeOccupation(page, 'Student')
		await completeAge(page, '21-25')
	})

	test('lock button is disabled until 2 pain points are picked', async ({ page }) => {
		const lockBtn = page.getByTestId('lock-button')
		await expect(lockBtn).toBeDisabled()

		await page.locator('button:has-text("Email")').click()
		await expect(lockBtn).toBeDisabled()

		await page.locator('button:has-text("dinner")').click()
		await expect(lockBtn).toBeEnabled()
	})

	test('selecting more than 3 pain points is rejected', async ({ page }) => {
		await page.locator('button:has-text("Email")').click()
		await page.locator('button:has-text("dinner")').click()
		await page.locator('button:has-text("Money goes")').click()
		await page.locator('button:has-text("Posting to every")').click()
		// Should still show 3 (4th rejected)
		await expect(page.getByTestId('lock-button')).toContainText('Lock in 3')
	})

	test('adding a custom pain via "Something else"', async ({ page }) => {
		await page.locator('button:has-text("Email")').click()
		await page.getByTestId('option-something-else').click()
		const input = page.locator('input[placeholder*="custom option"]')
		await input.fill('Invoice tracking')
		await page.locator('button:has-text("Add")').click()
		await expect(page.getByTestId('lock-button')).toContainText('Lock in 2')
	})

	test('locking pain points advances to AI comfort', async ({ page }) => {
		await page.locator('button:has-text("Email")').click()
		await page.locator('button:has-text("dinner")').click()
		await page.getByTestId('lock-button').click()
		await waitForStep(page, STEP_LABELS.aiComfort)
	})

	test('deselecting a pain point removes it from selection', async ({ page }) => {
		await page.locator('button:has-text("Email")').click()
		await page.locator('button:has-text("dinner")').click()
		await expect(page.getByTestId('lock-button')).toContainText('Lock in 2')
		// Deselect "Email"
		await page.locator('button:has-text("Email")').click()
		await expect(page.getByTestId('lock-button')).toContainText('Lock in 1')
		await expect(page.getByTestId('lock-button')).toBeDisabled()
	})
})

// ── Step 4: AI Comfort ─────────────────────────────────────────────────────

test.describe('Step 4: AI Comfort', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
		await completeOccupation(page, 'Freelance')
		await completeAge(page, '31+')
		await completePainPoints(page, ['Email', 'Money goes'])
	})

	test('selecting a comfort level auto-advances to step 5', async ({ page }) => {
		await page.locator('button:has-text("Weekly")').click()
		await waitForStep(page, STEP_LABELS.aiTools)
	})
})

// ── Step 5: AI Tools ───────────────────────────────────────────────────────

test.describe('Step 5: AI Tools', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
		await completeOccupation(page)
		await completeAge(page)
		await completePainPoints(page, ['Email', 'Posting to every'])
		await completeAiComfort(page)
	})

	test('locking AI tools completes profile and shows upload hub', async ({ page }) => {
		await selectOption(page, 'ChatGPT')
		await page.getByTestId('lock-button').click()
		await page.locator(`text=${STEP_LABELS.upload}`).waitFor({ state: 'visible', timeout: 10000 })
	})

	test('"Never tried" on comfort skips tools and goes to upload', async ({ page }) => {
		// Reset: this test needs its own setup since beforeEach uses "A few times"
		const freshPage = page
		await startFresh(freshPage)
		await completeOccupation(freshPage)
		await completeAge(freshPage)
		await completePainPoints(freshPage, ['Email', 'Posting to every'])
		await freshPage.locator('button:has-text("Never tried")').click()
		// Should skip tools entirely and land on upload hub
		await freshPage
			.locator(`text=${STEP_LABELS.upload}`)
			.waitFor({ state: 'visible', timeout: 10000 })
	})
})

// ── ADHD Mode ──────────────────────────────────────────────────────────────

test.describe('ADHD Mode', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
	})

	test('ADHD toggle is visible and off by default', async ({ page }) => {
		const btn = page.getByTestId('adhd-toggle')
		await expect(btn).toBeVisible()
		await expect(btn).toHaveAttribute('aria-pressed', 'false')
	})

	test('toggling ADHD mode shows and hides video placeholder', async ({ page }) => {
		const btn = page.getByTestId('adhd-toggle')
		await btn.click()
		await expect(btn).toHaveAttribute('aria-pressed', 'true')
		await expect(page.locator('text=satisfying video goes here')).toBeVisible()
		await btn.click()
		await expect(btn).toHaveAttribute('aria-pressed', 'false')
		await expect(page.locator('text=satisfying video goes here')).not.toBeVisible()
	})
})

// ── Form Persistence ───────────────────────────────────────────────────────

test.describe('Form Persistence', () => {
	test('completed profile survives page reload', async ({ page }) => {
		await startFresh(page)
		await completeProfile(page)

		await page.reload()
		// Wait for the resume banner — the deterministic signal that localStorage was restored
		await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
		await expect(page.locator(`text=${STEP_LABELS.upload}`)).toBeVisible()
	})

	test('clicking "Start fresh" resets to step 1', async ({ page }) => {
		await startFresh(page)
		await completeProfile(page)

		await page.reload()
		const startFreshBtn = page.locator('button:has-text("Start fresh")')
		// Wait for the button — proves hydration completed after reload
		await startFreshBtn.waitFor({ state: 'visible', timeout: 10000 })
		await startFreshBtn.click()
		await page
			.locator(`text=${STEP_LABELS.occupation}`)
			.waitFor({ state: 'visible', timeout: 10000 })
	})
})

// ── Data Upload Hub ────────────────────────────────────────────────────────

test.describe('Data Upload Hub', () => {
	test.beforeEach(async ({ page }) => {
		await startFresh(page)
		await completeProfile(page)
	})

	test('upload cards for instant and deep sources are visible', async ({ page }) => {
		await expect(page.getByTestId('upload-card-screentime')).toBeVisible()
		await expect(page.getByTestId('upload-card-subscriptions')).toBeVisible()
		await expect(page.getByTestId('upload-card-chatgpt')).toBeVisible()
	})

	test('"Generate results" is disabled and "Skip" is enabled with no uploads', async ({ page }) => {
		await expect(page.getByTestId('generate-results-button')).toBeDisabled()
		await expect(page.getByTestId('skip-button')).toBeEnabled()
	})

	test('clicking "How to export" toggles card instructions', async ({ page }) => {
		await acceptOptIn(page)
		const toggle = page.locator('button:has-text("How to export")').first()
		await toggle.click()
		// Screen Time instructions mention the 3 screenshots needed
		await expect(page.locator('text=We need 3 screenshots')).toBeVisible()
	})
})

// ── Full Flow ──────────────────────────────────────────────────────────────

test.describe('Full Flow', () => {
	test('completing profile and skipping upload shows results', async ({ page }) => {
		await startFresh(page)
		await completeProfile(page)

		const skipBtn = page.getByTestId('skip-button')
		await skipBtn.scrollIntoViewIfNeeded()
		await skipBtn.click()

		// Wait for the results phase — deterministic, no arbitrary sleep needed.
		// The first recommendation (TestApp) is always locked/blurred by LockedRecommendationCard
		// (only position==='second' renders the real name). App2 at index 1 is the visible card.
		await page.locator('text=App2').waitFor({ state: 'visible', timeout: 20000 })
	})

	test('session API receives correct profile data', async ({ page }) => {
		let body: Record<string, unknown> | null = null

		// Register capturing route before other setup — route handlers are matched
		// in registration order, so this takes precedence over any later session route
		await page.route('**/api/discovery/session', async (route) => {
			body = JSON.parse(route.request().postData() ?? '{}')
			await route.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'cap' }) })
		})

		// Use addInitScript instead of double-navigate to avoid stale atom state.
		// Cookie consent requires a valid JSON record — plain 'accepted' fails parseRecord().
		await page.addInitScript(() => {
			localStorage.clear()
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
		})
		await page.route('**/api/discovery/upload', (r) =>
			r.fulfill({ status: 200, body: '{"success":true}' }),
		)
		await page.route('**/api/discovery/adaptive', (r) =>
			r.fulfill({ status: 200, body: '{"followUps":[]}' }),
		)
		await page.route('**/api/discovery/analyze', (r) =>
			r.fulfill({ status: 200, body: '{"success":true,"analysis":null}' }),
		)
		await page.goto('/start', { waitUntil: 'domcontentloaded' })
		await page.locator(`text=${STEP_LABELS.occupation}`).waitFor({ timeout: 10000 })

		await completeOccupation(page, 'Freelance')
		await completeAge(page, '26-30')
		await completePainPoints(page, ['Email', 'Job application'])
		await completeAiComfort(page, "Can't stop")
		await completeAiTools(page, ['Claude'])

		// Session is NOT created on profile completion anymore (lazy).
		// Trigger it via Skip — which calls ensureSession() then analyze.
		expect(body).toBeNull()

		// Skip doesn't require opt-in (no data upload) — it just creates session + analyzes
		await page.getByTestId('skip-button').click()

		// Skip triggers ensureSession() → session API call
		await page.waitForResponse('**/api/discovery/session', { timeout: 10000 })
		expect(body).not.toBeNull()
		const b = body as Record<string, unknown>
		expect(b.occupation).toBe('freelance')
		expect(b.ageBracket).toBe('26-30')
		expect(b.aiComfort).toBe(4)
	})
})

// ── Error States ──────────────────────────────────────────────────────────

test.describe('Error States', () => {
	test('error banner appears when session API returns 500', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.clear()
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
		})
		// Mock session endpoint to return 500
		await page.route('**/api/discovery/session', (r) =>
			r.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) }),
		)
		await page.route('**/api/subscribe', (r) =>
			r.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
		)
		await page.goto('/start', { waitUntil: 'domcontentloaded' })
		await page.locator(`text=${STEP_LABELS.occupation}`).waitFor({ timeout: 10000 })

		// Complete all 5 steps — session is NOT created here (lazy)
		await selectOption(page, 'Working')
		await waitForStep(page, STEP_LABELS.age)
		await selectOption(page, '26-30')
		await waitForStep(page, STEP_LABELS.pain)
		await page.locator('button:has-text("Email")').click()
		await page.locator('button:has-text("dinner")').click()
		await page.getByTestId('lock-button').click()
		await waitForStep(page, STEP_LABELS.aiComfort)
		await page.locator('button:has-text("A few times")').click()
		await waitForStep(page, STEP_LABELS.aiTools)
		await selectOption(page, 'ChatGPT')
		await page.getByTestId('lock-button').click()

		// Now on upload phase. Skip triggers lazy session creation → 500 error
		await page.locator(`text=${STEP_LABELS.upload}`).waitFor({ state: 'visible', timeout: 5000 })
		await page.getByTestId('skip-button').click()

		// Error banner should appear (session creation failed)
		await expect(page.getByTestId('error-banner')).toBeVisible({ timeout: 10000 })
	})
})

// ── Responsive ────────────────────────────────────────────────────────────

test.describe('Responsive', () => {
	test('step 1 renders correctly at 375px mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 })
		await startFresh(page)
		await expect(page.getByTestId('step-counter')).toBeVisible()
		await expect(page.getByTestId('step-prompt')).toBeVisible()
		await expect(page.getByTestId('option-student')).toBeVisible()
		// Slot board should be visible on mobile too
		await expect(page.getByTestId('slot-label-occupation')).toBeVisible()
	})
})
