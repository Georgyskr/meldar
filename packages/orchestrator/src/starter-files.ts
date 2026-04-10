type StarterFile = {
	readonly path: string
	readonly content: string
}

const PACKAGE_JSON = `{
  "name": "meldar-user-app",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "panda codegen --silent && next dev",
    "build": "panda codegen --silent && next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@pandacss/dev": "1.8.1",
    "@park-ui/panda-preset": "0.43.1",
    "@types/node": "20.14.8",
    "@types/react": "19.2.0",
    "@types/react-dom": "19.2.0",
    "typescript": "5.9.2"
  }
}
`

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "styled-system/*": ["./styled-system/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`

const NEXT_CONFIG_TS = `import type { NextConfig } from 'next'

const config: NextConfig = {
	reactStrictMode: true,
	allowedDevOrigins: ['*.localhost', '*.workers.dev', '*.meldar.ai'],
}

export default config
`

const PANDA_CONFIG_TS = `import { defineConfig } from '@pandacss/dev'
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
`

const APP_LAYOUT_TSX = `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'My app',
	description: 'Made with Meldar',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body>
				{children}
				<a
					href="https://meldar.ai/?ref=app"
					target="_blank"
					rel="noopener noreferrer"
					style={{
						position: 'fixed',
						bottom: 12,
						right: 12,
						padding: '6px 12px',
						background: 'rgba(98, 49, 83, 0.9)',
						color: '#fff',
						fontSize: 11,
						fontFamily: 'Inter, system-ui, sans-serif',
						fontWeight: 500,
						letterSpacing: '0.04em',
						borderRadius: 20,
						textDecoration: 'none',
						zIndex: 50,
						boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
						transition: 'opacity 0.2s',
					}}
				>
					Made with Meldar
				</a>
			</body>
		</html>
	)
}
`

const APP_PAGE_TSX = `import { Box, Flex } from 'styled-system/jsx'

export default function Page() {
	return (
		<Flex minHeight="100vh" alignItems="center" justifyContent="center" padding="8">
			<Box
				maxWidth="560px"
				padding="8"
				borderRadius="lg"
				background="bg.subtle"
				textAlign="center"
			>
				<h1>Your app is ready</h1>
				<p>
					This is where your app will live. Pick a step on the left and click
					<strong> Make this now </strong>
					to let Meldar write the code.
				</p>
			</Box>
		</Flex>
	)
}
`

const APP_GLOBALS_CSS = `@layer reset, base, tokens, recipes, utilities;
`

const GITIGNORE = `# dependencies
node_modules/

# next.js
.next/
out/

# panda css
styled-system/

# env
.env
.env*.local

# debug
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# typescript
*.tsbuildinfo
next-env.d.ts
`

const APP_OG_IMAGE_TSX = `import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'App preview — Made with Meldar'
export const revalidate = 86400

export default function OgImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					background: 'linear-gradient(135deg, #faf9f6 0%, #f0eeec 100%)',
					fontFamily: 'Inter, system-ui, sans-serif',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						marginBottom: 24,
					}}
				>
					<div
						style={{
							width: 48,
							height: 48,
							borderRadius: 12,
							background: 'linear-gradient(135deg, #623153, #FFB876)',
						}}
					/>
					<span style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>
						My app
					</span>
				</div>
				<span style={{ fontSize: 18, color: '#81737a' }}>
					Made with Meldar
				</span>
			</div>
		),
		{ ...size },
	)
}
`

const POSTCSS_CONFIG_CJS = `module.exports = {
	plugins: {
		'@pandacss/dev/postcss': {},
	},
}
`

export const STARTER_FILES: readonly StarterFile[] = [
	{ path: 'package.json', content: PACKAGE_JSON },
	{ path: 'tsconfig.json', content: TSCONFIG_JSON },
	{ path: 'next.config.ts', content: NEXT_CONFIG_TS },
	{ path: 'panda.config.ts', content: PANDA_CONFIG_TS },
	{ path: 'postcss.config.cjs', content: POSTCSS_CONFIG_CJS },
	{ path: 'src/app/layout.tsx', content: APP_LAYOUT_TSX },
	{ path: 'src/app/page.tsx', content: APP_PAGE_TSX },
	{ path: 'src/app/globals.css', content: APP_GLOBALS_CSS },
	{ path: 'src/app/opengraph-image.tsx', content: APP_OG_IMAGE_TSX },
	{ path: '.gitignore', content: GITIGNORE },
]

export const LOCKED_STARTER_PATHS: ReadonlySet<string> = new Set([
	'package.json',
	'tsconfig.json',
	'next.config.ts',
	'panda.config.ts',
	'postcss.config.cjs',
	'src/app/layout.tsx',
	'.gitignore',
])

export function getStarterFileContent(path: string): string | null {
	const file = STARTER_FILES.find((f) => f.path === path)
	return file?.content ?? null
}
