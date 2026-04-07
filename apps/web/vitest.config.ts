import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// test/e2e/** is Playwright, not vitest.
		exclude: ['**/node_modules/**', 'dist/**', '.next/**', 'test/e2e/**'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
})
