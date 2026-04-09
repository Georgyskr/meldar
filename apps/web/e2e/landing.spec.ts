import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Landing page', () => {
	test('renders hero and links to sign-up', async ({ page }) => {
		await page.goto('/')
		await expect(page).toHaveTitle(/Meldar/i)
		await expect(page.locator('h1').first()).toBeVisible()
	})
})
