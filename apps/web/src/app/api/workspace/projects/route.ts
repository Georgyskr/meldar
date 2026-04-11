import { STARTER_FILES } from '@meldar/orchestrator'
import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { provisionSubdomain } from '@/server/domains'
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

function serializeError(err: unknown): Record<string, unknown> {
	if (!(err instanceof Error)) return { message: String(err) }
	const out: Record<string, unknown> = {
		name: err.name,
		message: err.message,
	}
	for (const key of ['code', 'operation', 'projectId', 'buildId', 'path'] as const) {
		if (key in err) out[key] = (err as unknown as Record<string, unknown>)[key]
	}
	if (err.stack) out.stack = err.stack.split('\n').slice(0, 6).join('\n')
	if (err.cause) out.cause = serializeError(err.cause)
	return out
}

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
		console.error(
			'[api/workspace/projects] list query failed:',
			JSON.stringify(serializeError(err)),
		)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load projects' } },
			{ status: 500 },
		)
	}
}

// Starter scaffold for every new project — pre-seeded before Claude touches
// anything so the project is always a valid buildable Next.js 16 + Panda
// skeleton from the moment the user clicks "Make this now" on their first step.
const STARTER_INITIAL_FILES = STARTER_FILES.map((f) => ({ path: f.path, content: f.content }))

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

	const name = parsed.data.name ?? 'My project'

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	let hasR2 = true
	try {
		storage = buildProjectStorageFromEnv()
	} catch (err) {
		hasR2 = false
		// TODO: replace console.warn with structured logging + alert (Victoria Metrics / Grafana)
		console.warn(
			'[api/workspace/projects] R2 not configured, running in degraded mode:',
			err instanceof Error ? err.message : 'Unknown',
		)
		storage = buildProjectStorageWithoutR2()
	}

	try {
		const projectOpts = {
			userId: session.userId,
			name,
			templateId: 'next-landing-v1',
			initialFiles: hasR2 ? STARTER_INITIAL_FILES : [],
		} as const
		let created: Awaited<ReturnType<typeof storage.createProject>>
		try {
			created = await storage.createProject(projectOpts)
		} catch (firstErr) {
			console.warn(
				'[api/workspace/projects] first attempt failed, retrying once:',
				JSON.stringify(serializeError(firstErr)),
			)
			created = await storage.createProject(projectOpts)
		}
		let subdomain: string | undefined
		try {
			subdomain = await provisionSubdomain(created.project.id, name)
		} catch (subErr) {
			console.error(
				'[api/workspace/projects] subdomain provisioning failed:',
				JSON.stringify(serializeError(subErr)),
			)
		}
		return NextResponse.json({ projectId: created.project.id, subdomain }, { status: 200 })
	} catch (err) {
		console.error(
			'[api/workspace/projects] createProject failed after retry:',
			JSON.stringify(serializeError(err)),
		)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' } },
			{ status: 500 },
		)
	}
}
