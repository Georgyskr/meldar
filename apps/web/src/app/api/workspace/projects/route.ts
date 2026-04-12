import { STARTER_FILES } from '@meldar/orchestrator'
import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { provisionSubdomain } from '@/server/domains'
import { requireAuth } from '@/server/identity/require-auth'
import {
	checkRateLimit,
	mustHaveRateLimit,
	projectsCreateLimit,
	projectsListLimit,
} from '@/server/lib/rate-limit'
import { listUserProjects } from '@/server/projects/list-user-projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { serializeError } from './serialize-error'

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
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success } = await checkRateLimit(listLimiter, auth.userId)
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
		const projects = await listUserProjects(auth.userId)
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

const STARTER_INITIAL_FILES = STARTER_FILES.map((f) => ({ path: f.path, content: f.content }))

export async function POST(request: NextRequest) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success: createSuccess } = await checkRateLimit(limiter, auth.userId)
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
		console.warn(
			'[api/workspace/projects] R2 not configured, running in degraded mode:',
			err instanceof Error ? err.message : 'Unknown',
		)
		storage = buildProjectStorageWithoutR2()
	}

	try {
		const projectOpts = {
			userId: auth.userId,
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
