import path from 'node:path'
import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
	testDir: './e2e',
	expect: {
		timeout: 20_000,
	},
	retries: 0,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3101',
		headless: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'pnpm dev --port 3101',
		port: 3101,
		reuseExistingServer: !process.env.CI,
	},
	projects: [
		{
			name: 'setup',
			testMatch: /.*\.setup\.ts/,
		},
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				storageState: 'e2e/.auth/user.json',
				contextOptions: { reducedMotion: 'reduce' },
			},
			dependencies: ['setup'],
			testMatch: /.*\.spec\.ts/,
		},
	],
})
