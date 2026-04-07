import { expect, test } from '@playwright/test'
import { fillQuiz, mockDiscoveryApis, startFresh } from './helpers'

/**
 * E2E: Browser navigation — back button, reload, stale localStorage.
 * Verifies the /start flow handles non-linear navigation gracefully.
 */

test.describe('Browser Back Button', () => {
	test('pressing back from upload phase does not crash', async ({ page }) => {
		await startFresh(page, { session: { sessionId: 'nav-test' } })
		await fillQuiz(page)

		// Confirm we are on upload phase
		await expect(page.locator('text=Add your data')).toBeVisible()

		// Navigate to another page first so goBack has a real destination
		await page.goto('/', { waitUntil: 'domcontentloaded' })

		// Now go back to /start
		await page.goBack()

		// Page should not crash — it should show either the quiz or upload phase
		// (depending on whether localStorage persisted the phase across navigation).
		await expect(page.locator('body')).toBeVisible({ timeout: 8000 })

		// Wait for hydration — look for any recognizable UI element
		const hasQuiz = await page
			.locator('text=What do you do?')
			.isVisible()
			.catch(() => false)
		const hasUpload = await page
			.locator('text=Add your data')
			.isVisible()
			.catch(() => false)
		const hasWelcomeBack = await page
			.locator('text=Welcome back')
			.isVisible()
			.catch(() => false)

		// At least one of these should be true — the page recovered
		expect(hasQuiz || hasUpload || hasWelcomeBack).toBe(true)
	})
})

test.describe('Reload and Resume', () => {
	test('reload on upload phase shows "Welcome back" banner with "Start fresh"', async ({
		page,
	}) => {
		await startFresh(page, { session: { sessionId: 'nav-test' } })
		await fillQuiz(page)

		// Reload the page
		await page.reload()

		// Should show "Welcome back" banner (profile is persisted, phase is 'data')
		await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })

		// Click "Start fresh"
		const startFreshBtn = page.locator('button:has-text("Start fresh")')
		await startFreshBtn.waitFor({ state: 'visible', timeout: 10000 })
		await startFreshBtn.click()

		// Should return to step 1 of the quiz
		await page.locator('text=What do you do?').waitFor({ state: 'visible', timeout: 10000 })
	})
})

test.describe('Stale localStorage', () => {
	test('phase=results with no analysis gracefully falls back', async ({ page }) => {
		await mockDiscoveryApis(page, { session: { sessionId: 'nav-test' } })
		await page.emulateMedia({ reducedMotion: 'reduce' })

		// Pre-set stale localStorage: phase is 'results' but no analysis data
		await page.addInitScript(() => {
			localStorage.clear()
			localStorage.setItem(
				'cookie-consent',
				JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
			)
			// Simulate stale state: phase says results but analysis is null
			localStorage.setItem('meldar-phase', JSON.stringify('results'))
			localStorage.setItem('meldar-analysis', JSON.stringify(null))
			localStorage.setItem('meldar-session-id', JSON.stringify('stale-session'))
			localStorage.setItem(
				'meldar-profile',
				JSON.stringify({
					occupation: 'working',
					ageBracket: '26-30',
					painPicks: ['email-triage'],
					aiComfort: 2,
					aiToolsUsed: ['chatgpt'],
				}),
			)
		})

		await page.goto('/start', { waitUntil: 'domcontentloaded' })

		// The page should NOT crash. It should either:
		// 1. Show the quiz (fallback to profile phase)
		// 2. Show the upload phase (data phase)
		// 3. Show the results with the "Welcome back" banner
		// But definitely NOT a blank/error page.
		await expect(page.locator('body')).toBeVisible({ timeout: 8000 })

		// Wait for hydration to complete — look for any recognizable UI element
		const hasQuiz = await page
			.locator('text=What do you do?')
			.isVisible()
			.catch(() => false)
		const hasUpload = await page
			.locator('text=Add your data')
			.isVisible()
			.catch(() => false)
		const hasWelcomeBack = await page
			.locator('text=Welcome back')
			.isVisible()
			.catch(() => false)

		// At least one of these should be true — the app recovered from stale state
		const recovered = hasQuiz || hasUpload || hasWelcomeBack
		console.log('Recovery state:', { hasQuiz, hasUpload, hasWelcomeBack })
		expect(recovered).toBe(true)
	})
})
