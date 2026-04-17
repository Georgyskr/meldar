import { type APIRequestContext, expect, test } from '@playwright/test'

async function createOrGetProject(request: APIRequestContext): Promise<string> {
	const res = await request.post('/api/onboarding', {
		data: { verticalId: 'other' },
	})
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
	test('empty workspace is not a blank screen', async ({ page, request }) => {
		const projectId = await createOrGetProject(request)

		await page.goto(`/workspace/${projectId}`)

		const bodyText = (await page.textContent('body')) ?? ''
		expect(bodyText.length).toBeGreaterThan(100)
	})
})
