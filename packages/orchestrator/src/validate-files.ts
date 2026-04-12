import path from 'node:path'
import ts from 'typescript'

export type ValidationError = {
	readonly path: string
	readonly rule: string
	readonly message: string
}

export type ValidationResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly errors: readonly ValidationError[] }

export type FileInput = {
	readonly path: string
	readonly content: string
}

const ALLOWED_PACKAGE_PREFIXES = ['next/', 'styled-system/']

export const ALLOWED_PACKAGES = new Set([
	'react',
	'react-dom',
	'next',
	'next/link',
	'next/image',
	'next/navigation',
	'next/font/google',
	'next/font/local',
	'next/headers',
	'next/og',
	'styled-system/jsx',
	'styled-system/css',
	'styled-system/patterns',
	'styled-system/tokens',
	'styled-system/recipes',
])

const DENIED_PACKAGES = new Set(['next/dynamic'])

function isAllowedPackage(spec: string): boolean {
	if (DENIED_PACKAGES.has(spec)) return false
	if (ALLOWED_PACKAGES.has(spec)) return true
	return ALLOWED_PACKAGE_PREFIXES.some((prefix) => spec.startsWith(prefix))
}

function isRelativeImport(spec: string): boolean {
	return spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/')
}

function resolveRelativeImport(
	fromPath: string,
	importSpec: string,
	knownPaths: ReadonlySet<string>,
): boolean {
	let resolved: string
	if (importSpec.startsWith('@/')) {
		resolved = `src/${importSpec.slice(2)}`
	} else {
		const dir = path.posix.dirname(fromPath)
		resolved = path.posix.normalize(path.posix.join(dir, importSpec))
	}

	const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
	return extensions.some((ext) => knownPaths.has(resolved + ext))
}

function isTypeScriptFile(filePath: string): boolean {
	return filePath.endsWith('.ts') || filePath.endsWith('.tsx')
}

function isStringLiteralLike(node: ts.Node): boolean {
	return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

function getStringValue(node: ts.Node): string {
	if (ts.isStringLiteral(node)) return node.text
	if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text
	return ''
}

function extractImportSources(content: string, filePath: string): string[] {
	const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false, scriptKind)

	const sources: string[] = []

	function walk(node: ts.Node): void {
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			sources.push(node.moduleSpecifier.text)
		}
		if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			sources.push(node.moduleSpecifier.text)
		}
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length === 1 &&
			isStringLiteralLike(node.arguments[0])
		) {
			sources.push(getStringValue(node.arguments[0]))
		}
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'require' &&
			node.arguments.length === 1 &&
			isStringLiteralLike(node.arguments[0])
		) {
			sources.push(getStringValue(node.arguments[0]))
		}
		ts.forEachChild(node, walk)
	}

	walk(sf)
	return sources
}

export function validateFileImports(
	files: readonly FileInput[],
	existingPaths: ReadonlySet<string>,
): ValidationResult {
	const errors: ValidationError[] = []
	const filePaths = new Set(files.map((f) => f.path))
	const allKnownPaths = new Set([...filePaths, ...existingPaths])

	for (const file of files) {
		if (!isTypeScriptFile(file.path)) continue

		const sources = extractImportSources(file.content, file.path)
		for (const spec of sources) {
			if (isRelativeImport(spec)) {
				if (!resolveRelativeImport(file.path, spec, allKnownPaths)) {
					errors.push({
						path: file.path,
						rule: 'unresolved-import',
						message: `Import "${spec}" could not be resolved — the target file does not exist`,
					})
				}
			} else if (!isAllowedPackage(spec)) {
				errors.push({
					path: file.path,
					rule: 'forbidden-package',
					message: `Package "${spec}" is not available — only react, next/*, and styled-system/* are installed`,
				})
			}
		}
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true }
}

const ALLOWED_APP_FILE_NAMES = new Set([
	'page.tsx',
	'layout.tsx',
	'loading.tsx',
	'error.tsx',
	'not-found.tsx',
	'globals.css',
	'opengraph-image.tsx',
	'icon.tsx',
])

export function validateFilePath(rawPath: string): ValidationResult {
	const filePath = path.posix.normalize(rawPath)

	if (filePath.includes('..')) {
		return {
			ok: false,
			errors: [
				{
					path: rawPath,
					rule: 'blocked-path',
					message: `Path traversal ("..") is not allowed: "${rawPath}"`,
				},
			],
		}
	}

	if (filePath === 'middleware.ts' || filePath === 'instrumentation.ts') {
		return {
			ok: false,
			errors: [
				{
					path: filePath,
					rule: 'blocked-path',
					message: `"${filePath}" is not allowed in user apps`,
				},
			],
		}
	}

	if (
		filePath.endsWith('/route.ts') ||
		filePath.endsWith('/route.tsx') ||
		filePath === 'route.ts' ||
		filePath === 'route.tsx'
	) {
		return {
			ok: false,
			errors: [
				{
					path: filePath,
					rule: 'blocked-path',
					message: 'API routes (route.ts) are not allowed in user apps',
				},
			],
		}
	}

	if (filePath.startsWith('app/api/') || filePath.startsWith('src/app/api/')) {
		return {
			ok: false,
			errors: [
				{
					path: filePath,
					rule: 'blocked-path',
					message: 'The app/api/ directory is not allowed in user apps',
				},
			],
		}
	}

	if (filePath.startsWith('app/') || filePath.startsWith('src/app/')) {
		const fileName = path.posix.basename(filePath)
		if (ALLOWED_APP_FILE_NAMES.has(fileName)) return { ok: true }
		return {
			ok: false,
			errors: [
				{
					path: filePath,
					rule: 'blocked-path',
					message: `"${fileName}" is not an allowed App Router file name — use page.tsx, layout.tsx, loading.tsx, error.tsx, or not-found.tsx`,
				},
			],
		}
	}

	if (filePath.startsWith('src/')) return { ok: true }

	if (filePath.startsWith('public/')) return { ok: true }

	return {
		ok: false,
		errors: [
			{
				path: filePath,
				rule: 'blocked-path',
				message: `Files must be in app/, src/, or public/ — "${filePath}" is not allowed`,
			},
		],
	}
}

const CLIENT_HOOKS = new Set([
	'useState',
	'useEffect',
	'useRef',
	'useCallback',
	'useMemo',
	'useTransition',
	'useRouter',
	'usePathname',
	'useSearchParams',
	'useReducer',
	'useContext',
	'useId',
	'useDeferredValue',
	'useInsertionEffect',
	'useLayoutEffect',
	'useSyncExternalStore',
])

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
	{ pattern: /\beval\s*\(/, label: 'eval()' },
	{ pattern: /\bnew\s+Function\s*\(/, label: 'new Function()' },
	{ pattern: /\bchild_process\b/, label: 'child_process' },
	{ pattern: /\bprocess\.env\b/, label: 'process.env' },
	{ pattern: /["']use server["']/, label: '"use server" directive' },
	{ pattern: /\bfetch\s*\(/, label: 'fetch() network call' },
	{ pattern: /\bdangerouslySetInnerHTML\b/, label: 'dangerouslySetInnerHTML (XSS risk)' },
	{ pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
	{ pattern: /\bnew\s+WebSocket\s*\(/, label: 'WebSocket' },
	{ pattern: /\bnew\s+EventSource\s*\(/, label: 'EventSource' },
	{ pattern: /\bnavigator\s*\.\s*sendBeacon\s*\(/, label: 'navigator.sendBeacon()' },
	{ pattern: /\bdocument\s*\.\s*write\s*\(/, label: 'document.write()' },
]

const EXTERNAL_URL_IN_JSX_RE =
	/\b(?:src|href|action|poster|data)\s*=\s*["'](https?:\/\/[^"']+)["']/g

function hasUseClientDirective(content: string): boolean {
	const firstLines = content.slice(0, 200)
	return /^['"]use client['"]/.test(firstLines.trimStart())
}

function usesClientHooks(content: string, filePath: string): boolean {
	if (!isTypeScriptFile(filePath)) return false
	const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false, scriptKind)

	let found = false
	function walk(node: ts.Node): void {
		if (found) return
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			CLIENT_HOOKS.has(node.expression.text)
		) {
			found = true
			return
		}
		ts.forEachChild(node, walk)
	}
	walk(sf)
	return found
}

function hasDefaultExport(content: string): boolean {
	return /\bexport\s+default\b/.test(content)
}

function isAppPageFile(filePath: string): boolean {
	return (
		(filePath.startsWith('app/') || filePath.startsWith('src/app/')) &&
		filePath.endsWith('/page.tsx')
	)
}

export function validateStructure(files: readonly FileInput[]): ValidationResult {
	const errors: ValidationError[] = []

	for (const file of files) {
		if (!isTypeScriptFile(file.path)) continue

		if (usesClientHooks(file.content, file.path) && !hasUseClientDirective(file.content)) {
			errors.push({
				path: file.path,
				rule: 'missing-use-client',
				message:
					"This file uses React hooks (useState, useEffect, etc.) but is missing the 'use client' directive at the top",
			})
		}

		if (isAppPageFile(file.path) && !hasDefaultExport(file.content)) {
			errors.push({
				path: file.path,
				rule: 'missing-default-export',
				message: 'App Router page.tsx files must have a default export',
			})
		}

		for (const { pattern, label } of FORBIDDEN_PATTERNS) {
			if (pattern.test(file.content)) {
				errors.push({
					path: file.path,
					rule: 'forbidden-pattern',
					message: `"${label}" is not allowed in user apps`,
				})
			}
		}

		for (const match of file.content.matchAll(EXTERNAL_URL_IN_JSX_RE)) {
			const url = match[1]
			errors.push({
				path: file.path,
				rule: 'forbidden-pattern',
				message: `External URL "${url.slice(0, 60)}" is not allowed — user apps must not make external requests`,
			})
		}
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true }
}

const VALID_COLOR_TOKENS = new Set([
	...Array.from({ length: 12 }, (_, i) => `sand.${i + 1}`),
	'bg.canvas',
	'bg.default',
	'bg.subtle',
	'bg.muted',
	'bg.emphasized',
	'bg.disabled',
	'fg.default',
	'fg.muted',
	'fg.subtle',
	'fg.disabled',
	'fg.error',
	'border.default',
	'border.muted',
	'border.subtle',
	'border.disabled',
	'border.outline',
	'border.error',
	'colorPalette',
	'current',
	'currentColor',
	'inherit',
	'transparent',
	'black',
	'white',
	...Array.from({ length: 12 }, (_, i) => `red.${i + 1}`),
	...Array.from({ length: 12 }, (_, i) => `gray.${i + 1}`),
	'sand.default',
	'sand.emphasized',
	'sand.fg',
	'sand.text',
	'red.default',
	'red.emphasized',
	'red.fg',
	'red.text',
	'gray.default',
	'gray.emphasized',
	'gray.fg',
	'gray.text',
	'primary',
	'primaryMid',
	'primaryDark',
	'onPrimary',
	'primaryContainer',
	'onPrimaryContainer',
	'secondary',
	'secondaryLight',
	'onSecondary',
	'surface',
	'surfaceDim',
	'surfaceContainer',
	'surfaceContainerLow',
	'surfaceContainerHigh',
	'surfaceContainerHighest',
	'surfaceContainerLowest',
	'onSurface',
	'onSurfaceVariant',
	'outline',
	'outlineVariant',
	'inverseSurface',
	'inverseOnSurface',
	'inversePrimary',
	'success',
	'error',
	'errorMuted',
	'errorBg',
	'errorBorder',
	'accent.default',
	'accent.fg',
])

const VALID_TEXT_STYLES = new Set([
	'primary.xxl',
	'primary.xl',
	'primary.lg',
	'primary.md',
	'primary.sm',
	'primary.xs',
	'secondary.xl',
	'secondary.lg',
	'secondary.md',
	'secondary.sm',
	'secondary.xs',
	'tertiary.xl',
	'tertiary.lg',
	'tertiary.md',
	'tertiary.sm',
	'tertiary.xs',
	'label.lg',
	'label.md',
	'label.sm',
	'display.xl',
	'display.lg',
	'display.md',
	'display.sm',
	'button.lg',
	'button.md',
	'button.sm',
	'italic.lg',
	'italic.md',
	'italic.sm',
	'heading.1',
	'heading.2',
	'heading.3',
	'heading.4',
	'heading.5',
	'heading.6',
	'body.xl',
	'body.lg',
	'body.md',
	'body.sm',
	'body.xs',
	'heading.hero',
	'heading.display',
	'heading.section',
	'heading.card',
	'body.lead',
	'body.base',
	'label.upper',
])

const SHORTHAND_TO_LOGICAL: Record<string, string> = {
	mb: 'marginBlockEnd',
	mt: 'marginBlockStart',
	ml: 'marginInlineStart',
	mr: 'marginInlineEnd',
	mx: 'marginInline',
	my: 'marginBlock',
	pb: 'paddingBlockEnd',
	pt: 'paddingBlockStart',
	pl: 'paddingInlineStart',
	pr: 'paddingInlineEnd',
	px: 'paddingInline',
	py: 'paddingBlock',
}

function isColorTokenValue(value: string): boolean {
	return /^[a-zA-Z]/.test(value) && value.includes('.')
}

function isValidColorToken(value: string): boolean {
	return VALID_COLOR_TOKENS.has(value)
}

const JSX_PROP_RE =
	/\b(bg|background|backgroundColor|color|borderColor|outlineColor|fill|stroke)=["']([^"']+)["']/g
const CSS_COLOR_PROP_RE =
	/\b(bg|background|backgroundColor|color|borderColor|outlineColor|fill|stroke)\s*:\s*['"]([^'"]+)['"]/g
const TEXT_STYLE_JSX_RE = /\btextStyle=["']([^"']+)["']/g
const TEXT_STYLE_CSS_RE = /\btextStyle\s*:\s*['"]([^'"]+)['"]/g
const SHORTHAND_JSX_RE = /\b(mb|mt|ml|mr|mx|my|pb|pt|pl|pr|px|py)[=:]["']/g
const SHORTHAND_CSS_RE = /\b(mb|mt|ml|mr|mx|my|pb|pt|pl|pr|px|py)\s*:/g

export function validatePandaCss(files: readonly FileInput[]): ValidationResult {
	const errors: ValidationError[] = []

	for (const file of files) {
		if (!isTypeScriptFile(file.path)) continue
		const content = file.content

		for (const match of content.matchAll(JSX_PROP_RE)) {
			const value = match[2]
			if (isColorTokenValue(value) && !isValidColorToken(value)) {
				errors.push({
					path: file.path,
					rule: 'invalid-token',
					message: `Color token "${value}" does not exist in the sand preset. Valid: sand.1–sand.12, bg.canvas, bg.subtle, fg.default, fg.muted, etc.`,
				})
			}
		}

		for (const match of content.matchAll(CSS_COLOR_PROP_RE)) {
			const value = match[2]
			if (isColorTokenValue(value) && !isValidColorToken(value)) {
				errors.push({
					path: file.path,
					rule: 'invalid-token',
					message: `Color token "${value}" does not exist in the sand preset. Valid: sand.1–sand.12, bg.canvas, bg.subtle, fg.default, fg.muted, etc.`,
				})
			}
		}

		for (const match of content.matchAll(TEXT_STYLE_JSX_RE)) {
			const value = match[1]
			if (!VALID_TEXT_STYLES.has(value)) {
				errors.push({
					path: file.path,
					rule: 'invalid-text-style',
					message: `textStyle "${value}" does not exist. Valid: primary.xs–xxl, secondary.xs–xl, label.sm–lg, display.sm–xl, heading.1–6, body.xs–xl, button.sm–lg`,
				})
			}
		}

		for (const match of content.matchAll(TEXT_STYLE_CSS_RE)) {
			const value = match[1]
			if (!VALID_TEXT_STYLES.has(value)) {
				errors.push({
					path: file.path,
					rule: 'invalid-text-style',
					message: `textStyle "${value}" does not exist. Valid: primary.xs–xxl, secondary.xs–xl, label.sm–lg, display.sm–xl, heading.1–6, body.xs–xl, button.sm–lg`,
				})
			}
		}

		for (const match of content.matchAll(SHORTHAND_JSX_RE)) {
			const prop = match[1]
			const logical = SHORTHAND_TO_LOGICAL[prop] ?? prop
			errors.push({
				path: file.path,
				rule: 'shorthand-prop',
				message: `Shorthand "${prop}" is banned — use the logical property "${logical}" instead`,
			})
		}

		for (const match of content.matchAll(SHORTHAND_CSS_RE)) {
			const prop = match[1]
			const logical = SHORTHAND_TO_LOGICAL[prop] ?? prop
			errors.push({
				path: file.path,
				rule: 'shorthand-prop',
				message: `Shorthand "${prop}" is banned — use the logical property "${logical}" instead`,
			})
		}
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true }
}

export function validateBuildFiles(
	files: readonly FileInput[],
	existingPaths: ReadonlySet<string>,
): ValidationResult {
	const allErrors: ValidationError[] = []

	for (const file of files) {
		if (!file.content.trim()) {
			allErrors.push({
				path: file.path,
				rule: 'empty-file',
				message: 'File has no content — empty files are not allowed',
			})
			continue
		}
		const pathResult = validateFilePath(file.path)
		if (!pathResult.ok) allErrors.push(...pathResult.errors)
	}

	const importResult = validateFileImports(files, existingPaths)
	if (!importResult.ok) allErrors.push(...importResult.errors)

	const structureResult = validateStructure(files)
	if (!structureResult.ok) allErrors.push(...structureResult.errors)

	const pandaResult = validatePandaCss(files)
	if (!pandaResult.ok) allErrors.push(...pandaResult.errors)

	return allErrors.length > 0 ? { ok: false, errors: allErrors } : { ok: true }
}
