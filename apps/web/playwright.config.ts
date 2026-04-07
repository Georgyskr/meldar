import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './test/e2e',
	timeout: 15_000,
	retries: 0,
	use: {
		baseURL: 'http://localhost:3001',
		headless: true,
		screenshot: 'only-on-failure',
	},
	webServer: {
		command: 'pnpm build && PORT=3001 pnpm start',
		port: 3001,
		reuseExistingServer: true,
		timeout: 120_000,
	},
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				contextOptions: {
					reducedMotion: 'reduce',
				},
			},
		},
	],
})
