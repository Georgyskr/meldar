import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import sand from '@park-ui/panda-preset/colors/sand'

export default defineConfig({
	preflight: true,
	presets: [
		createPreset({
			accentColor: sand,
			grayColor: sand,
			radius: 'md',
		}),
	],
	include: ['./src/**/*.{js,jsx,ts,tsx}'],
	exclude: [],
	outdir: 'styled-system',
	jsxFramework: 'react',
})
