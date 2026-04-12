import { getDb } from '@meldar/db/client'
import { agentEvents } from '@meldar/db/schema'
import { desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/identity/require-auth'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()
const EVENTS_LIMIT = 50

type RouteContext = { params: Promise<{ projectId: string }> }

function fetchRecentEvents(projectId: string) {
	const db = getDb()
	return db
		.select()
		.from(agentEvents)
		.where(eq(agentEvents.projectId, projectId))
		.orderBy(desc(agentEvents.createdAt))
		.limit(EVENTS_LIMIT)
}

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const wantsSSE = request.headers.get('accept') === 'text/event-stream'

	try {
		const events = await fetchRecentEvents(projectId)

		if (wantsSSE) {
			const encoder = new TextEncoder()
			const stream = new ReadableStream({
				start(controller) {
					for (const event of events) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
					}
					controller.close()
				},
			})

			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			})
		}

		return NextResponse.json({ events })
	} catch (err) {
		console.error('[agent/events] query failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load events' } },
			{ status: 500 },
		)
	}
}
