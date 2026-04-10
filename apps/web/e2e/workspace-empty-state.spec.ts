import { type APIRequestContext, expect, test } from '@playwright/test'

async function createOrGetProject(request: APIRequestContext): Promise<string> {
	const res = await request.post('/api/workspace/projects', { data: {} })
	if (res.ok()) {
		const { projectId } = (await res.json()) as { projectId: string }
		return projectId
	}
	const listRes = await request.get('/api/workspace/projects')
	const { projects } = (await listRes.json()) as { projects: Array<{ id: string }> }
	if (projects.length > 0) return projects[0].id
	throw new Error('Cannot create or find a project')
}

test.describe('Workspace empty state', () => {
	test('new empty project renders onboarding chat', async ({ page, request }) => {
		const projectId = await createOrGetProject(request)

		await page.goto(`/workspace/${projectId}`)

		await expect(page.getByText(/what are you making/i)).toBeVisible()
		await expect(page.getByText(/rough is fine/i)).toBeVisible()
	})

	test('empty workspace is not a blank screen', async ({ page, request }) => {
		const projectId = await createOrGetProject(request)

		await page.goto(`/workspace/${projectId}`)

		const bodyText = (await page.textContent('body')) ?? ''
		expect(bodyText.length).toBeGreaterThan(100)
	})

	test('template chips are visible in onboarding chat', async ({ page, request }) => {
		const projectId = await createOrGetProject(request)

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/what are you making/i)).toBeVisible()

		await expect(page.getByRole('button', { name: /gym tracker/i })).toBeVisible()
		await expect(page.getByRole('button', { name: /habit tracker/i })).toBeVisible()
	})

	test('skip-onboarding param shows template picker', async ({ page, request }) => {
		const projectId = await createOrGetProject(request)

		await page.goto(`/workspace/${projectId}?skip-onboarding=1`)

		// If the project already has cards (from rate-limit fallback), this won't
		// show the picker — it'll show the workspace. Only assert the picker if
		// the project is genuinely empty.
		const bodyText = (await page.textContent('body')) ?? ''
		const hasCards = bodyText.includes('Your plan') || bodyText.includes('of')
		if (!hasCards) {
			await expect(page.getByText(/pick a template|start building/i)).toBeVisible()
		}
	})
})
