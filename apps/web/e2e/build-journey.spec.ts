import { expect, test } from '@playwright/test'

test.describe('Build journey', () => {
	test('create project, apply template, trigger build via galaxy view', async ({
		page,
		request,
	}) => {
		const res = await request.post('/api/workspace/projects', { data: {} })
		expect(res.ok()).toBeTruthy()
		const { projectId } = (await res.json()) as { projectId: string }
		expect(projectId).toMatch(/^[0-9a-f-]{36}$/)

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const templateButton = page.locator('button').filter({ hasText: 'Weight Tracker' })
		await templateButton.click()

		await expect(page.getByText(/pick a template/i)).toBeHidden()

		await expect(page.getByText('Dashboard layout')).toBeVisible()

		const readyLabel = page.getByText('Ready to create')
		await expect(readyLabel.first()).toBeVisible()

		let buildRequested = false
		let capturedBody: { kanbanCardId?: string; prompt?: string } | null = null

		await page.route('**/api/workspace/*/build', async (route) => {
			const postData = route.request().postDataJSON() as {
				kanbanCardId?: string
				prompt?: string
			}
			capturedBody = postData
			buildRequested = true

			const events = [
				`event: started\ndata: ${JSON.stringify({ type: 'started', buildId: 'build_mock', projectId, kanbanCardId: postData.kanbanCardId })}\n\n`,
				`event: file_written\ndata: ${JSON.stringify({ type: 'file_written', path: 'src/app/page.tsx', contentHash: 'abc123', sizeBytes: 1200, fileIndex: 0 })}\n\n`,
				`event: file_written\ndata: ${JSON.stringify({ type: 'file_written', path: 'src/components/Dashboard.tsx', contentHash: 'def456', sizeBytes: 800, fileIndex: 1 })}\n\n`,
				`event: committed\ndata: ${JSON.stringify({ type: 'committed', buildId: 'build_mock', tokenCost: 1500, actualCents: 5, fileCount: 2, kanbanCardId: postData.kanbanCardId })}\n\n`,
				`event: done\ndata: [DONE]\n\n`,
			]

			await route.fulfill({
				status: 200,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
				body: events.join(''),
			})
		})

		const makeButton = page.getByRole('button', { name: /make this now/i })
		await expect(makeButton.first()).toBeVisible()
		await makeButton.first().click()

		await page.waitForResponse(
			(res) => res.url().includes('/api/workspace/') && res.url().includes('/build'),
		)

		expect(buildRequested).toBe(true)
		expect(capturedBody).not.toBeNull()
		const body = capturedBody as unknown as { kanbanCardId?: string; prompt?: string }
		expect(body.kanbanCardId).toBeTruthy()
		expect(body.prompt).toBeTruthy()
	})

	test('template application creates kanban milestones with subtasks', async ({
		page,
		request,
	}) => {
		const res = await request.post('/api/workspace/projects', { data: {} })
		const { projectId } = (await res.json()) as { projectId: string }

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const templateButton = page.locator('button').filter({ hasText: 'Expense Tracker' })
		await templateButton.click()

		await expect(page.getByText(/pick a template/i)).toBeHidden()

		const chapterLabels = page.locator('text=/Ch \\d+/i')
		await expect(chapterLabels.first()).toBeVisible()

		const taskButtons = page.locator('button').filter({ hasText: /^(?!.*Sign out).{4,}$/ })
		expect(await taskButtons.count()).toBeGreaterThan(3)
	})
})
