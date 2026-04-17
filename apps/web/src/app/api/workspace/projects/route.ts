import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/server/identity/require-auth'
import { checkRateLimit, mustHaveRateLimit, projectsListLimit } from '@/server/lib/rate-limit'
import { listUserProjects } from '@/server/projects/list-user-projects'
import { serializeError } from './serialize-error'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
