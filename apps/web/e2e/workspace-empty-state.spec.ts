import { expect, test } from '@playwright/test'

test.describe('Workspace empty state', () => {
	test('new empty project renders template picker overlay', async ({ page, request }) => {
		const res = await request.post('/api/workspace/projects', { data: {} })
		expect(res.ok()).toBeTruthy()
		const { projectId } = (await res.json()) as { projectId: string }
		expect(projectId).toMatch(/^[0-9a-f-]{36}$/)

		await page.goto(`/workspace/${projectId}`)

		await expect(page.getByText(/pick a template/i)).toBeVisible()
		await expect(page.getByText(/or describe what you want/i)).toBeVisible()
	})

	test('empty workspace is not a blank screen', async ({ page, request }) => {
		const res = await request.post('/api/workspace/projects', { data: {} })
		const { projectId } = (await res.json()) as { projectId: string }

		await page.goto(`/workspace/${projectId}`)

		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const bodyText = (await page.textContent('body')) ?? ''
		expect(bodyText.length).toBeGreaterThan(100)
	})

	test('applying a template populates the workspace', async ({ page, request }) => {
		const res = await request.post('/api/workspace/projects', { data: {} })
		const { projectId } = (await res.json()) as { projectId: string }

		await page.goto(`/workspace/${projectId}`)
		await expect(page.getByText(/pick a template/i)).toBeVisible()

		const templateButtons = page
			.locator('button')
			.filter({ hasText: /^(?!.*(?:describe|Sign out|New project|\+|Roadmap))[^+]{6,}$/ })
		await templateButtons.first().click()

		await expect(page.getByText(/pick a template/i)).toBeHidden()
	})
})
