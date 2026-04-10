import { assertSafeSandboxPath } from '@meldar/sandbox'
import {
	buildProjectStorageFromEnv,
	buildProjectStorageWithoutR2,
	ProjectNotFoundError,
} from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { type BundledLanguage, codeToHtml } from 'shiki'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { checkRateLimit, mustHaveRateLimit, projectsListLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CONTENT_BYTES = 100 * 1024

const projectIdSchema = z.string().uuid()
const pathSchema = z.string().min(1).max(512)

const limiter = mustHaveRateLimit(projectsListLimit, 'workspace-files')

type RouteContext = { params: Promise<{ projectId: string }> }

const LANG_BY_EXT: Record<string, BundledLanguage> = {
	ts: 'typescript',
	tsx: 'tsx',
	js: 'javascript',
	jsx: 'jsx',
	mjs: 'javascript',
	cjs: 'javascript',
	json: 'json',
	md: 'markdown',
	mdx: 'mdx',
	html: 'html',
	htm: 'html',
	css: 'css',
	scss: 'scss',
	yaml: 'yaml',
	yml: 'yaml',
	toml: 'toml',
	sh: 'bash',
	bash: 'bash',
	py: 'python',
	sql: 'sql',
	svg: 'xml',
	xml: 'xml',
}

function detectLang(path: string): BundledLanguage | 'text' {
	const lastDot = path.lastIndexOf('.')
	if (lastDot === -1) return 'text'
	const ext = path.slice(lastDot + 1).toLowerCase()
	return LANG_BY_EXT[ext] ?? 'text'
}

export async function GET(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(limiter, session.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Slow down.' } },
			{ status: 429 },
		)
	}

	const rawPath = request.nextUrl.searchParams.get('path') ?? ''
	const parsedPath = pathSchema.safeParse(rawPath)
	if (!parsedPath.success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'path query param is required' } },
			{ status: 400 },
		)
	}

	try {
		assertSafeSandboxPath(parsedPath.data, { projectId })
	} catch (err) {
		return NextResponse.json(
			{
				error: {
					code: 'UNSAFE_PATH',
					message: err instanceof Error ? err.message : 'Unsafe path',
				},
			},
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	let hasR2 = true
	try {
		storage = buildProjectStorageFromEnv()
	} catch {
		hasR2 = false
		storage = buildProjectStorageWithoutR2()
	}

	if (!hasR2) {
		return NextResponse.json(
			{
				error: {
					code: 'STORAGE_UNAVAILABLE',
					message: 'File storage is not configured in this environment.',
				},
			},
			{ status: 503 },
		)
	}

	let content: string
	try {
		content = await storage.readFile(projectId, parsedPath.data)
	} catch (err) {
		if (err instanceof ProjectNotFoundError) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'File not found' } },
				{ status: 404 },
			)
		}
		console.error('[api/workspace/files] readFile failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load file' } },
			{ status: 500 },
		)
	}

	const fullByteLength = new TextEncoder().encode(content).length
	let truncated = false
	if (fullByteLength > MAX_CONTENT_BYTES) {
		content = content.slice(0, MAX_CONTENT_BYTES)
		truncated = true
	}

	const lang = detectLang(parsedPath.data)

	let html: string
	try {
		if (lang === 'text') {
			html = `<pre class="shiki plaintext"><code>${escapeHtml(content)}</code></pre>`
		} else {
			html = await codeToHtml(content, { lang, theme: 'github-light' })
		}
	} catch (err) {
		console.error('[api/workspace/files] highlight failed', err)
		html = `<pre class="shiki plaintext"><code>${escapeHtml(content)}</code></pre>`
	}

	return NextResponse.json({
		path: parsedPath.data,
		content,
		html: sanitizeShikiHtml(html),
		lang,
		sizeBytes: fullByteLength,
		truncated,
	})
}

function sanitizeShikiHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
		.replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
		.replace(/javascript\s*:/gi, 'blocked:')
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}
