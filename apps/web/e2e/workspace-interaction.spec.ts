import { type APIRequestContext, expect, test } from '@playwright/test'

async function createProject(request: APIRequestContext, name = 'E2E Test Project') {
	const res = await request.post('/api/workspace/projects', { data: { name } })
	expect(res.ok()).toBeTruthy()
	const { projectId } = (await res.json()) as { projectId: string }
	expect(projectId).toMatch(/^[0-9a-f-]{36}$/)
	return projectId
}

async function applyTemplate(request: APIRequestContext, projectId: string, templateId: string) {
	const res = await request.post(`/api/workspace/${projectId}/apply-template`, {
		data: { templateId },
	})
	expect(res.ok()).toBeTruthy()
	const body = (await res.json()) as { cards: unknown[] }
	expect(body.cards.length).toBeGreaterThan(0)
	return body.cards
}

test.describe('Workspace interaction', () => {
	test('onboarding chat prompt shows coming-soon message', async ({ page, request }) => {
		const projectId = await createProject(request)

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const chatButton = page.getByRole('button', { name: /describe what you want/i })
		await expect(chatButton).toBeVisible()
		await chatButton.click()

		await expect(page.getByText(/describe-your-app chat is coming next/i)).toBeVisible()
	})

	test('template chip click populates the workspace with kanban cards', async ({
		page,
		request,
	}) => {
		const projectId = await createProject(request, 'Template Test')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const templateButton = page.getByRole('button').filter({ hasText: /Weight Tracker/ })
		await templateButton.click()

		await expect(page.getByText(/pick a template/i)).toBeHidden()

		await expect(page.getByText('Ch 1')).toBeVisible()

		const chapterHeadings = page.locator('text=/^Ch \\d+$/')
		await expect(chapterHeadings.first()).toBeVisible()
		const chapterCount = await chapterHeadings.count()
		expect(chapterCount).toBeGreaterThanOrEqual(2)

		await expect(page.getByText('Ready to create')).toBeVisible()

		const taskButtons = page.locator('button').filter({ hasText: /.{4,}/ })
		const taskCount = await taskButtons.count()
		expect(taskCount).toBeGreaterThan(5)
	})

	test('clicking a task card shows task detail / focus mode', async ({ page, request }) => {
		const projectId = await createProject(request, 'Task Focus Test')
		await applyTemplate(request, projectId, 'weight-tracker')

		await page.goto(`/workspace/${projectId}`)

		await expect(page.getByText('Ch 1')).toBeVisible()

		const readyLabel = page.getByText('Ready to create')
		await expect(readyLabel).toBeVisible()

		const readyTask = page
			.locator('button')
			.filter({ has: page.getByText('Ready to create') })
			.first()
		await readyTask.click()

		await expect(page.getByText('Make this now')).toBeVisible()

		const taskTitleHeading = page.locator('h2')
		await expect(taskTitleHeading).toBeVisible()
		const titleText = await taskTitleHeading.textContent()
		expect(titleText?.length).toBeGreaterThan(3)

		await expect(page.getByText('Back to overview')).toBeVisible()
	})

	test('workspace persists state across page reload', async ({ page, request }) => {
		const projectName = 'Persist Test'
		const projectId = await createProject(request, projectName)
		await applyTemplate(request, projectId, 'expense-tracker')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText('Ch 1')).toBeVisible()

		const firstChapterTitle = await page
			.locator('text=/^Ch 1$/')
			.locator('..')
			.locator('..')
			.textContent()

		await page.reload()

		await expect(page.getByText('Ch 1')).toBeVisible()

		const reloadedTitle = await page
			.locator('text=/^Ch 1$/')
			.locator('..')
			.locator('..')
			.textContent()
		expect(reloadedTitle).toBe(firstChapterTitle)

		await expect(page.getByRole('heading', { name: projectName })).toBeVisible()
	})

	test('multiple projects are independent', async ({ page, request }) => {
		const projectIdA = await createProject(request, 'Project Alpha')
		const projectIdB = await createProject(request, 'Project Beta')

		await applyTemplate(request, projectIdA, 'weight-tracker')
		await applyTemplate(request, projectIdB, 'task-manager')

		await page.goto(`/workspace/${projectIdA}`)
		await expect(page.getByText('Ch 1')).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Project Alpha' })).toBeVisible()

		const projectAText = await page.locator('body').textContent()
		expect(projectAText).toContain('Dashboard layout')

		await page.goto(`/workspace/${projectIdB}`)
		await expect(page.getByText('Ch 1')).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Project Beta' })).toBeVisible()

		const projectBText = await page.locator('body').textContent()
		expect(projectBText).not.toContain('Dashboard layout')
		expect(projectBText).toContain('Task list')

		await page.goto(`/workspace/${projectIdA}`)
		await expect(page.getByRole('heading', { name: 'Project Alpha' })).toBeVisible()
		const revisitText = await page.locator('body').textContent()
		expect(revisitText).toContain('Dashboard layout')
	})

	test('task focus shows status label and learn text', async ({ page, request }) => {
		const projectId = await createProject(request, 'Status Label Test')
		await applyTemplate(request, projectId, 'portfolio-site')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText('Ch 1')).toBeVisible()

		const readyTask = page
			.locator('button')
			.filter({ has: page.getByText('Ready to create') })
			.first()
		await readyTask.click()

		await expect(page.getByText(/ready to create/i)).toBeVisible()

		await expect(page.getByText(/you.ll learn/i)).toBeVisible()

		await expect(page.getByText('Make this now')).toBeVisible()
	})

	test('back to overview returns to plan mode', async ({ page, request }) => {
		const projectId = await createProject(request, 'Back Nav Test')
		await applyTemplate(request, projectId, 'weight-tracker')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText('Ch 1')).toBeVisible()

		const readyTask = page
			.locator('button')
			.filter({ has: page.getByText('Ready to create') })
			.first()
		await readyTask.click()

		await expect(page.getByText('Make this now')).toBeVisible()

		await page.getByText('Back to overview').click()

		await expect(page.getByText('Your next step')).toBeVisible()
	})

	test('empty project template picker lists all templates', async ({ page, request }) => {
		const projectId = await createProject(request, 'Picker Inventory Test')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const expectedTemplates = [
			'Weight Tracker',
			'Expense Tracker',
			'Portfolio Site',
			'Task Manager',
			'Booking Page',
			'Feedback Collector',
		]

		for (const name of expectedTemplates) {
			await expect(page.getByRole('button').filter({ hasText: new RegExp(name) })).toBeVisible()
		}
	})

	test('locked task shows dependency info', async ({ page, request }) => {
		const projectId = await createProject(request, 'Locked Task Test')
		await applyTemplate(request, projectId, 'weight-tracker')

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText('Ch 1')).toBeVisible()

		const lockedTask = page
			.locator('button')
			.filter({ hasText: /.{6,}/ })
			.and(page.locator('[style*="opacity: 0.45"]'))
		const lockedCount = await lockedTask.count()

		if (lockedCount > 0) {
			await lockedTask.first().click()
			await expect(page.getByText(/waiting for/i)).toBeVisible()
		} else {
			const draftTasks = page.locator('button').filter({ hasText: /.{6,}/ })
			const count = await draftTasks.count()
			expect(count).toBeGreaterThan(2)
		}
	})
})
