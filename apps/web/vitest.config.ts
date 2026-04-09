import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// e2e/** is Playwright, not vitest.
		exclude: ['**/node_modules/**', 'dist/**', '.next/**', 'e2e/**'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@styled-system': path.resolve(__dirname, './styled-system'),
		},
	},
})
