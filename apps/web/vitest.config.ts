import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		exclude: ['**/node_modules/**', 'dist/**', '.next/**', 'e2e/**'],
		setupFiles: ['./src/test-setup.ts'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@styled-system': path.resolve(__dirname, './styled-system'),
		},
	},
})
