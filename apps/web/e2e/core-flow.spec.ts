import AxeBuilder from '@axe-core/playwright'
import { getDb } from '@meldar/db/client'
import { projects, users } from '@meldar/db/schema'
import { expect, type Page, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { installSseCapture, type SseCaptureHandle } from './lib/sse-capture'

const TEST_EMAIL = `e2e-core-${Date.now()}@meldar-test.local`
const TEST_PASSWORD = 'E2e-test-password-9876!'

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ retries: 0 })

async function injectAuthCookie(page: Page): Promise<void> {
	const secret = process.env.AUTH_SECRET
	if (!secret) throw new Error('AUTH_SECRET required for E2E cookie injection')

	const db = getDb()
	const [user] = await db
		.select({ id: users.id, tokenVersion: users.tokenVersion })
		.from(users)
		.where(eq(users.email, TEST_EMAIL))
		.limit(1)
	if (!user) throw new Error(`Test user ${TEST_EMAIL} not found — sign-up step may have failed`)

	const token = jwt.sign(
		{
			userId: user.id,
			email: TEST_EMAIL,
			emailVerified: false,
			tokenVersion: user.tokenVersion,
		},
		secret,
		{ expiresIn: '7d', algorithm: 'HS256' },
	)

	await page.context().addCookies([
		{
			name: 'meldar-auth',
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
			expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
		},
	])
}

const IGNORED_CONSOLE_PATTERNS = [
	/Download the React DevTools/,
	/Warning: Each child in a list/,
	/migrated since no migrate function/,
]

const PIPELINE_BUG_PATTERNS = [
	/invalid_request_error/i,
	/tool_use ids? (were|was) found without tool_result/i,
	/overloaded_error/i,
	/rate_limit_error/i,
	/\brequest_id:?\s*req_/i,
	/\b(4\d\d|5\d\d)\s+\{.*error/i,
	/Something went wrong\b/i,
]

function assertNoPipelineBugs(text: string | null | undefined, context: string): void {
	if (!text) return
	for (const pattern of PIPELINE_BUG_PATTERNS) {
		expect(text, `${context} leaked a backend-contract failure: ${text}`).not.toMatch(pattern)
	}
}

const NEXT_ERROR_PAGE_PATTERNS = [
	/Application error: a[n]? (client|server)-side exception/i,
	/<title>\s*(404|500)\b/i,
	/<title>\s*Internal Server Error\b/i,
]

const NEXT_APP_MARKERS = [
	/self\.__next_f\.push\(/,
	/_next\/static\//i,
	/href="\/_next\//i,
	/<html[^>]+data-next/i,
]

const AUTH_WALL_URL_PATTERNS = [/\/sign-in\b/, /\/sign-up\b/, /\/onboarding\b/]

const AUTH_WALL_BODY_PATTERNS = [
	/sign in to (meldar|your account)/i,
	/create your account/i,
	/<title>\s*Sign (in|up)\b/i,
]

function assertNotAuthWall(finalUrl: string, body: string): void {
	for (const pattern of AUTH_WALL_URL_PATTERNS) {
		expect(
			finalUrl,
			`preview navigation ended on an auth page (${finalUrl}) — the sandbox URL redirected to Meldar auth instead of serving content`,
		).not.toMatch(pattern)
	}
	for (const pattern of AUTH_WALL_BODY_PATTERNS) {
		expect(
			body,
			`preview body looks like a Meldar auth page (matched ${pattern}) — the beacon check would be a false negative`,
		).not.toMatch(pattern)
	}
}

function assertNotNextErrorPage(body: string): void {
	for (const pattern of NEXT_ERROR_PAGE_PATTERNS) {
		expect(body, `preview body looks like a Next.js error page (matched ${pattern})`).not.toMatch(
			pattern,
		)
	}
}

function assertLooksLikeNextApp(body: string): void {
	const hit = NEXT_APP_MARKERS.some((p) => p.test(body))
	expect(
		hit,
		'preview body does not look like a Next.js app (no self.__next_f.push, no _next/static, no /_next/ href, no data-next on <html>)',
	).toBe(true)
}

function stripCacheBuster(url: string): string {
	try {
		const u = new URL(url)
		u.searchParams.delete('t')
		return u.toString()
	} catch {
		return url
	}
}

function collectConsoleErrors(page: Page): string[] {
	const errors: string[] = []
	page.on('console', (msg) => {
		if (msg.type() !== 'error') return
		const text = msg.text()
		if (IGNORED_CONSOLE_PATTERNS.some((p) => p.test(text))) return
		errors.push(text)
	})
	return errors
}

// Chromium's CDP discards response bodies for completed streaming responses,
// so page.on('response') + response.text() fails on SSE. We capture the
// forensic signals we CAN get: preview URL, response status, and a body sample.
type BuildForensics = {
	projectId: string | null
	previewUrl: string | null
	previewStatus: number | null
	previewBody: string | null
	buildId: string | null
}

async function attachForensics(f: BuildForensics, sse?: SseCaptureHandle): Promise<void> {
	const info = test.info()
	await info.attach('build-context.json', {
		body: JSON.stringify(f, null, 2),
		contentType: 'application/json',
	})
	if (f.previewBody !== null) {
		await info.attach('preview-body.txt', {
			body: f.previewBody,
			contentType: 'text/plain',
		})
	}
	if (sse) {
		const jsonl = await sse.asJsonl().catch(() => '')
		if (jsonl.length > 0) {
			await info.attach('sse-events.jsonl', {
				body: jsonl,
				contentType: 'application/jsonl',
			})
		}
	}
}

test.describe('Core user flow', () => {
	test.afterAll(async () => {
		try {
			const db = getDb()
			const [user] = await db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.email, TEST_EMAIL))
				.limit(1)
			if (user) {
				await db.delete(projects).where(eq(projects.userId, user.id))
				await db.delete(users).where(eq(users.id, user.id))
			}
		} catch (err) {
			console.error('[e2e cleanup] Failed to clean up test user:', err)
		}
	})

	test('signup → onboard → build with beacon → preview verified → admin → settings', async ({
		page,
		browser,
	}) => {
		test.setTimeout(120_000)
		const consoleErrors = collectConsoleErrors(page)
		const forensics: BuildForensics = {
			projectId: null,
			previewUrl: null,
			previewStatus: null,
			previewBody: null,
			buildId: null,
		}
		const sseCapture = await installSseCapture(page, [
			/\/api\/workspace\/[0-9a-f-]{36}\/build$/,
			/\/api\/workspace\/[0-9a-f-]{36}\/auto-build$/,
		])
		const beacon = `MELDAR-E2E-${Date.now()}-BEACON`
		test.info().annotations.push({ type: 'beacon', description: beacon })

		try {
			await test.step('sign up + land on onboarding', async () => {
				await page.goto('/sign-up')
				await expect(page.getByText('Create your account')).toBeVisible()
				await page.fill('#signup-email', TEST_EMAIL)
				await page.fill('#signup-password', TEST_PASSWORD)
				await page.getByRole('button', { name: /create account/i }).click()
				await page.waitForURL('**/onboarding**')
				await expect(page.getByText('What do you need today')).toBeVisible()
			})

			await test.step('onboarding door A → workspace', async () => {
				await injectAuthCookie(page)
				await page.goto('/onboarding')
				await expect(page.getByText('What do you need today')).toBeVisible()
				await page.getByRole('button', { name: /I need something for my business/i }).click()
				await expect(page.getByText('What kind of business')).toBeVisible()
				await page.getByRole('radio', { name: /Consulting/i }).click()
				await page.getByRole('button', { name: /Continue/i }).click()
				await expect(page.getByText(/put together for you/i)).toBeVisible()
				await page.getByRole('button', { name: /Let.*go/i }).click()
				await page.waitForURL('**/workspace/**', { timeout: 30_000 })
				const match = page.url().match(/\/workspace\/([0-9a-f-]{36})/)
				expect(match).toBeTruthy()
				forensics.projectId = match?.[1] ?? null
				test.info().annotations.push({
					type: 'projectId',
					description: forensics.projectId ?? 'unknown',
				})
			})

			await test.step('workspace renders setup UI', async () => {
				await injectAuthCookie(page)
				await page.goto(`/workspace/${forensics.projectId}`)
				await expect(page.getByText(/Setting up your page|Opening your page/i)).toBeVisible()
				await expect(page.locator('textarea')).toBeVisible()
				await expect(page.getByLabel('Send feedback')).toBeVisible()
			})

			await test.step('build with beacon prompt + preview semantic fidelity', async () => {
				await injectAuthCookie(page)
				await page.goto(`/workspace/${forensics.projectId}`)

				const textarea = page.locator('textarea')
				await expect(textarea).toBeVisible()

				const pill = page.getByTestId('build-pill')
				await pill.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
				await pill.waitFor({ state: 'hidden', timeout: 180_000 }).catch(() => {})

				const keepBuildingBtn = page.getByRole('button', { name: /keep building/i })
				if (await keepBuildingBtn.isVisible().catch(() => false)) {
					await keepBuildingBtn.click()
				}

				await textarea.fill(
					`Create a simple landing page. Render an h1 element that has attribute data-e2e-beacon="${beacon}" and whose visible text is exactly "${beacon}". Add a short paragraph below describing a consulting business.`,
				)
				await page.getByLabel('Send feedback').click()

				const errorToast = page
					.getByRole('alert')
					.filter({ hasText: /something went sideways|setup stalled/i })
					.first()

				await Promise.race([
					expect(pill).toHaveAttribute('data-phase', 'building', { timeout: 60_000 }),
					expect(errorToast).toBeVisible({ timeout: 60_000 }),
				])

				const pillPhase = await pill.getAttribute('data-phase').catch(() => null)
				const buildStarted = pillPhase === 'building'

				if (!buildStarted) {
					const toastText = await errorToast.textContent()
					expect(toastText?.length ?? 0).toBeGreaterThan(10)
					assertNoPipelineBugs(toastText, 'immediate failure toast')
					return
				}

				await expect(pill).toHaveAttribute('data-phase', /done|failed/, { timeout: 180_000 })
				const finalPhase = await pill.getAttribute('data-phase')

				if (finalPhase === 'failed') {
					const toastText = await errorToast.textContent().catch(() => null)
					expect(toastText?.length ?? 0).toBeGreaterThan(10)
					assertNoPipelineBugs(toastText, 'post-build failure toast')
					return
				}

				const iframe = page.locator('iframe[title="Live preview"]')
				await expect(iframe).toBeVisible({ timeout: 75_000 })
				const rawSrc = await iframe.getAttribute('src')
				expect(rawSrc, 'iframe must have a real preview URL').toBeTruthy()
				expect(rawSrc).toMatch(/^https?:\/\//)
				const src = stripCacheBuster(rawSrc as string)
				forensics.previewUrl = src

				const sandboxContext = await browser.newContext()
				const sandboxPage = await sandboxContext.newPage()
				try {
					const navResponse = await sandboxPage.goto(src, {
						timeout: 180_000,
						waitUntil: 'domcontentloaded',
					})
					forensics.previewStatus = navResponse?.status() ?? null
					expect(
						navResponse?.status(),
						`preview URL ${src} should serve content (got ${navResponse?.status()})`,
					).toBeLessThan(400)

					const previewBody = await sandboxPage.content()
					forensics.previewBody = previewBody
					expect(previewBody.trim().length, 'preview body must be non-empty').toBeGreaterThan(0)
					assertNotAuthWall(sandboxPage.url(), previewBody)
					assertNotNextErrorPage(previewBody)
					assertLooksLikeNextApp(previewBody)

					const beaconLocator = sandboxPage.locator(`[data-e2e-beacon="${beacon}"]`)
					await expect(
						beaconLocator,
						`preview must render an element with data-e2e-beacon="${beacon}" — if absent, the LLM ignored an explicit structural instruction OR the rendered DOM does not match the SSR body`,
					).toBeVisible({ timeout: 60_000 })
					await expect(beaconLocator).toHaveText(beacon)

					const axeResult = await new AxeBuilder({ page: sandboxPage })
						.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
						.disableRules(['color-contrast'])
						.analyze()
					const serious = axeResult.violations.filter(
						(v) => v.impact === 'serious' || v.impact === 'critical',
					)
					expect(
						serious,
						`preview has serious/critical a11y violations:\n${serious.map((v) => `- ${v.id}: ${v.description}`).join('\n')}`,
					).toEqual([])
				} finally {
					await sandboxPage.close()
					await sandboxContext.close()
				}
			})

			await test.step('admin dashboard + settings', async () => {
				await injectAuthCookie(page)
				await page.goto(`/workspace/${forensics.projectId}/admin`)
				await expect(page.getByText('Manage your bookings and review AI actions.')).toBeVisible()
				await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Bookings' })).toBeVisible()
				await expect(page.getByRole('button', { name: 'Approvals' })).toBeVisible()

				await page.goto(`/workspace/${forensics.projectId}/admin/settings`)
				await expect(page.getByText('Business details')).toBeVisible()
				await expect(page.getByText('Services')).toBeVisible()
				await expect(page.getByText('Available hours')).toBeVisible()
			})

			await test.step('settings persist across reload', async () => {
				await injectAuthCookie(page)
				await page.goto(`/workspace/${forensics.projectId}/admin/settings`)
				await expect(page.getByText('Business details')).toBeVisible()

				const uniqueName = `E2E Biz ${Date.now()}`
				const nameInput = page.locator('#settings-name')
				await nameInput.clear()
				await nameInput.fill(uniqueName)

				const saveButton = page.getByRole('button', { name: /save changes/i })
				await saveButton.click()

				await expect(page.getByRole('alert').filter({ hasText: /settings saved/i })).toBeVisible({
					timeout: 10_000,
				})
				await expect(saveButton).toBeVisible()
				await expect(page.getByRole('alert').filter({ hasText: /could not save/i })).toBeHidden()

				await page.reload()
				await expect(page.getByText('Business details')).toBeVisible()
				await expect(nameInput).toHaveValue(uniqueName)
			})

			expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toHaveLength(
				0,
			)
			for (const line of consoleErrors) {
				assertNoPipelineBugs(line, 'browser console')
			}
		} finally {
			forensics.buildId = await sseCapture.buildId().catch(() => null)
			await attachForensics(forensics, sseCapture)
		}
	})
})
