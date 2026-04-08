import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import {
	checkRateLimit,
	mustHaveRateLimit,
	projectsCreateLimit,
	projectsListLimit,
} from '@/server/lib/rate-limit'
import { listUserProjects } from '@/server/projects/list-user-projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createProjectSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'name required')
		.max(80, 'name too long')
		.regex(/^[\p{L}\p{N}\s\-_.]+$/u, 'name contains forbidden characters')
		.optional(),
})

const limiter = mustHaveRateLimit(projectsCreateLimit, 'projectsCreate')
const listLimiter = mustHaveRateLimit(projectsListLimit, 'projectsList')

export async function GET(request: NextRequest) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(listLimiter, session.userId)
	if (!success) {
		return NextResponse.json(
			{
				error: {
					code: 'RATE_LIMITED',
					message: 'Too many requests. Slow down.',
				},
			},
			{ status: 429 },
		)
	}

	try {
		const projects = await listUserProjects(session.userId)
		return NextResponse.json({ projects })
	} catch (err) {
		console.error('[api/workspace/projects] list query failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load projects' } },
			{ status: 500 },
		)
	}
}

const STARTER_README = '# Meldar v3 project\n\nStart a build to see something here.\n'

export async function POST(request: NextRequest) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success: createSuccess } = await checkRateLimit(limiter, session.userId)
	if (!createSuccess) {
		return NextResponse.json(
			{
				error: {
					code: 'RATE_LIMITED',
					message: 'Too many projects. Wait an hour and try again.',
				},
			},
			{ status: 429 },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: { code: 'INVALID_JSON', message: 'Request body must be JSON' } },
			{ status: 400 },
		)
	}

	const parsed = createProjectSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid project name',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	const name = parsed.data.name ?? 'Untitled build'

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	let hasR2 = true
	try {
		storage = buildProjectStorageFromEnv()
	} catch (err) {
		hasR2 = false
		// TODO: replace console.warn with structured logging + alert (Victoria Metrics / Grafana)
		console.warn('[api/workspace/projects] R2 not configured, running in degraded mode:', err instanceof Error ? err.message : 'Unknown')
		storage = buildProjectStorageWithoutR2()
	}

	try {
		const created = await storage.createProject({
			userId: session.userId,
			name,
			templateId: 'next-landing-v1',
			initialFiles: hasR2 ? [{ path: 'README.md', content: STARTER_README }] : [],
		})
		return NextResponse.json({ projectId: created.project.id }, { status: 200 })
	} catch (err) {
		console.error('[api/workspace/projects] createProject failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' } },
			{ status: 500 },
		)
	}
}
