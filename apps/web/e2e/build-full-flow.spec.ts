import { expect, type Page, type Route, test } from '@playwright/test'

type OrchestratorEvent =
	| { type: 'started'; buildId: string; projectId: string; kanbanCardId?: string }
	| { type: 'prompt_sent'; promptHash: string; estimatedCents: number }
	| {
			type: 'file_written'
			path: string
			contentHash: string
			sizeBytes: number
			fileIndex: number
	  }
	| { type: 'sandbox_ready'; previewUrl: string; revision: number }
	| {
			type: 'committed'
			buildId: string
			tokenCost: number
			actualCents: number
			fileCount: number
			kanbanCardId?: string
	  }
	| { type: 'failed'; reason: string; buildId?: string; code?: string; kanbanCardId?: string }

function formatSseEvent(event: OrchestratorEvent): string {
	return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

function formatSseDone(): string {
	return 'event: done\ndata: [DONE]\n\n'
}

function buildSseBody(events: OrchestratorEvent[]): string {
	return events.map(formatSseEvent).join('') + formatSseDone()
}

const BUILD_ID = 'build_e2e-test-001'

async function createProjectWithTemplate(request: Page['request']): Promise<string> {
	const res = await request.post('/api/workspace/projects', { data: {} })
	expect(res.ok()).toBeTruthy()
	const { projectId } = (await res.json()) as { projectId: string }

	const applyRes = await request.post(`/api/workspace/${projectId}/apply-template`, {
		data: { templateId: 'weight-tracker' },
	})
	expect(applyRes.ok()).toBeTruthy()
	return projectId
}

async function navigateToWorkspace(page: Page, projectId: string): Promise<void> {
	await page.goto(`/workspace/${projectId}`)
	await expect(page.getByText('Ch 1')).toBeVisible()
}

async function mockCardPersistence(page: Page, projectId: string): Promise<void> {
	await page.route(`**/api/workspace/${projectId}/cards/**`, (route: Route) => {
		if (route.request().method() === 'PATCH') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ card: {} }),
			})
		} else {
			route.continue()
		}
	})
}

async function publishEvent(page: Page, event: OrchestratorEvent): Promise<void> {
	const dispatched = await page.evaluate((evt) => {
		type Fiber = {
			tag: number
			memoizedState: HookState | null
			return: Fiber | null
			child: Fiber | null
			sibling: Fiber | null
			stateNode: unknown
			type: unknown
		}

		type HookState = {
			memoizedState: unknown
			queue: { dispatch?: (action: unknown) => void } | null
			next: HookState | null
		}

		function getFiber(el: Element): Fiber | null {
			for (const key of Object.keys(el)) {
				if (key.startsWith('__reactFiber$')) {
					return (el as unknown as Record<string, unknown>)[key] as Fiber
				}
			}
			return null
		}

		function isWorkspaceBuildState(val: unknown): boolean {
			if (!val || typeof val !== 'object') return false
			const obj = val as Record<string, unknown>
			return 'cards' in obj && 'previewUrl' in obj && 'lastBuildAt' in obj
		}

		function findReducerDispatch(fiber: Fiber): ((action: unknown) => void) | null {
			let current: Fiber | null = fiber
			while (current) {
				if (current.memoizedState) {
					let hook: HookState | null = current.memoizedState as HookState
					while (hook) {
						if (hook.queue?.dispatch && isWorkspaceBuildState(hook.memoizedState)) {
							return hook.queue.dispatch
						}
						hook = hook.next
					}
				}
				current = current.return
			}
			return null
		}

		const root = document.getElementById('__next')
		if (!root) return false

		const firstChild = root.querySelector('*')
		if (!firstChild) return false

		const candidates = [
			root,
			firstChild,
			...Array.from(root.querySelectorAll('button')).slice(0, 5),
		]
		for (const el of candidates) {
			const fiber = getFiber(el)
			if (!fiber) continue
			const dispatch = findReducerDispatch(fiber)
			if (dispatch) {
				dispatch(evt)
				return true
			}
		}

		const allElements = root.querySelectorAll('*')
		for (let i = 0; i < Math.min(allElements.length, 100); i++) {
			const fiber = getFiber(allElements[i])
			if (!fiber) continue
			const dispatch = findReducerDispatch(fiber)
			if (dispatch) {
				dispatch(evt)
				return true
			}
		}

		return false
	}, event)

	if (!dispatched) {
		throw new Error(
			`Failed to dispatch event "${event.type}" — could not find WorkspaceBuildProvider reducer in the React fiber tree`,
		)
	}
}

function assertCapturedCardId(captured: string | null): string {
	expect(captured).toBeTruthy()
	return captured as string
}

async function selectFirstReadyTask(page: Page): Promise<void> {
	const readyTaskButton = page
		.locator('button')
		.filter({ hasText: /Ready to create/ })
		.first()
	await readyTaskButton.click()
}

async function clickMakeThisNow(page: Page): Promise<void> {
	await page.getByText('Make this now').click()
}

test.describe('Build full flow', () => {
	test('clicking Make this now sends build POST with correct card ID', async ({
		page,
		request,
	}) => {
		const projectId = await createProjectWithTemplate(request)

		let buildRequestCaptured = false
		let capturedBody: { kanbanCardId?: string; prompt?: string } | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			buildRequestCaptured = true
			capturedBody = route.request().postDataJSON() as typeof capturedBody

			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await navigateToWorkspace(page, projectId)
		await expect(page.getByText('Ready to create').first()).toBeVisible()

		await selectFirstReadyTask(page)
		await expect(page.getByText('Make this now')).toBeVisible()
		await clickMakeThisNow(page)

		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		expect(buildRequestCaptured).toBe(true)
		expect(capturedBody).toBeTruthy()
		const body = capturedBody as unknown as { kanbanCardId?: string; prompt?: string }
		expect(body.kanbanCardId).toMatch(/^[0-9a-f-]{36}$/)
		expect(body.prompt).toBeTruthy()
	})

	test('build progress shows building state and transitions to review on committed', async ({
		page,
		request,
	}) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)
		await navigateToWorkspace(page, projectId)

		await selectFirstReadyTask(page)
		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		await expect(page.getByText('Meldar is creating this for you')).toBeVisible()
		await expect(page.getByText('Updating...')).toBeVisible()

		await publishEvent(page, {
			type: 'committed',
			buildId: BUILD_ID,
			tokenCost: 1500,
			actualCents: 5,
			fileCount: 3,
			kanbanCardId: cardId,
		})

		await expect(page.getByText(/is in your app/)).toBeVisible()
		await expect(page.getByText('Updated just now')).toBeVisible()
		await expect(page.getByText('Ask for changes')).toBeVisible()
		await expect(page.getByText('Next step')).toBeVisible()

		await expect(page.getByText('Meldar is creating this for you')).toBeHidden()
		await expect(page.getByText('Updating...')).toBeHidden()
	})

	test('build failure: card transitions to failed, review mode not reached', async ({
		page,
		request,
	}) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)
		await navigateToWorkspace(page, projectId)

		await selectFirstReadyTask(page)
		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		await expect(page.getByText('Meldar is creating this for you')).toBeVisible()

		await publishEvent(page, {
			type: 'failed',
			reason: 'Build validation failed: framer-motion is not available',
			buildId: BUILD_ID,
			code: 'VALIDATION_ERROR',
			kanbanCardId: cardId,
		})

		await expect(page.getByText('Meldar is creating this for you')).toBeHidden()

		await expect(page.getByText(/is in your app/)).toBeHidden()
		await expect(page.getByText('Updated just now')).toBeHidden()
	})

	test('sandbox_ready event updates preview iframe src', async ({ page, request }) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)
		await navigateToWorkspace(page, projectId)

		const iframe = page.locator('iframe[title="App preview"]')
		await expect(iframe).toBeVisible()
		const initialSrc = await iframe.getAttribute('src')
		expect(initialSrc).toBeFalsy()

		await selectFirstReadyTask(page)
		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		const previewUrl = 'https://quiet-forest-4721.apps.meldar.ai'

		await publishEvent(page, {
			type: 'sandbox_ready',
			previewUrl,
			revision: 1,
		})

		await expect(iframe).toHaveAttribute('src', previewUrl)
	})

	test('review mode shows first build celebration dialog', async ({ page, request }) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)

		await page.addInitScript((pid: string) => {
			localStorage.removeItem(`meldar:first-build-celebrated:${pid}`)
		}, projectId)

		await navigateToWorkspace(page, projectId)

		await selectFirstReadyTask(page)
		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		await publishEvent(page, {
			type: 'committed',
			buildId: BUILD_ID,
			tokenCost: 1500,
			actualCents: 5,
			fileCount: 3,
			kanbanCardId: cardId,
		})

		const dialog = page.locator('[role="dialog"]')
		await expect(dialog).toBeVisible()
		await expect(page.getByText('Your first feature just shipped!')).toBeVisible()
		await expect(page.getByText('Keep building')).toBeVisible()

		await page.getByText('Keep building').click()
		await expect(dialog).toBeHidden()
	})

	test('SSE mock returns valid event stream format matching orchestrator wire format', async ({
		request,
	}) => {
		const projectId = await createProjectWithTemplate(request)

		const events: OrchestratorEvent[] = [
			{ type: 'started', buildId: BUILD_ID, projectId, kanbanCardId: 'placeholder' },
			{ type: 'prompt_sent', promptHash: 'abc123', estimatedCents: 5 },
			{
				type: 'file_written',
				path: 'src/app/page.tsx',
				contentHash: 'sha256_aaa',
				sizeBytes: 1200,
				fileIndex: 0,
			},
			{
				type: 'file_written',
				path: 'src/components/Dashboard.tsx',
				contentHash: 'sha256_bbb',
				sizeBytes: 800,
				fileIndex: 1,
			},
		]

		const sseResponseBody = buildSseBody(events)

		expect(sseResponseBody).toContain('event: started\n')
		expect(sseResponseBody).toContain('event: prompt_sent\n')
		expect(sseResponseBody).toContain('event: file_written\n')
		expect(sseResponseBody).toContain('event: done\ndata: [DONE]\n\n')

		const lines = sseResponseBody.split('\n')
		const dataLines = lines.filter((l) => l.startsWith('data: '))
		for (const dataLine of dataLines) {
			const payload = dataLine.slice(6)
			if (payload === '[DONE]') continue
			expect(() => JSON.parse(payload)).not.toThrow()
			const parsed = JSON.parse(payload) as { type: string }
			expect(parsed.type).toBeTruthy()
		}

		const records = sseResponseBody.split('\n\n').filter((r) => r.trim().length > 0)
		expect(records.length).toBe(events.length + 1) // events + done sentinel
	})

	test('building phase text progresses through timed stages', async ({ page, request }) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)
		await navigateToWorkspace(page, projectId)

		await selectFirstReadyTask(page)
		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		await expect(page.getByText('Thinking...')).toBeVisible()

		await expect(page.getByText('Writing code...')).toBeVisible()

		await expect(page.getByText('Almost done...')).toBeVisible()
	})

	test('chapter rail shows task status and highlighting updates on build', async ({
		page,
		request,
	}) => {
		const projectId = await createProjectWithTemplate(request)

		let capturedCardId: string | null = null

		await page.route(`**/api/workspace/${projectId}/build`, async (route) => {
			const body = route.request().postDataJSON() as { kanbanCardId?: string }
			capturedCardId = body.kanbanCardId ?? null
			await route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: buildSseBody([]),
			})
		})

		await mockCardPersistence(page, projectId)
		await navigateToWorkspace(page, projectId)

		await expect(page.getByText('Ch 1')).toBeVisible()

		await expect(page.getByText('Ready to create').first()).toBeVisible()

		await selectFirstReadyTask(page)
		await expect(page.getByText('Make this now')).toBeVisible()

		await clickMakeThisNow(page)
		await page.waitForResponse(`**/api/workspace/${projectId}/build`)

		const cardId = assertCapturedCardId(capturedCardId)

		await publishEvent(page, {
			type: 'started',
			buildId: BUILD_ID,
			projectId,
			kanbanCardId: cardId,
		})

		await expect(page.getByText('Meldar is creating this for you')).toBeVisible()

		await publishEvent(page, {
			type: 'committed',
			buildId: BUILD_ID,
			tokenCost: 1500,
			actualCents: 5,
			fileCount: 3,
			kanbanCardId: cardId,
		})

		await expect(page.getByText(/is in your app/)).toBeVisible()
	})
})
