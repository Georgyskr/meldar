import { getDb } from '@meldar/db/client'
import { pipelineRuns } from '@meldar/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PIPELINE_EVENTS_READ_LIMIT } from '@/server/build/timing'
import { requireAuth } from '@/server/identity/require-auth'
import { readPipelineEventsSince } from '@/server/lib/pipeline-event-log'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()
const runIdSchema = z.string().uuid()
const ACTIVE_STATES = ['running', 'deploying'] as const

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
	if (request.headers.get('x-meldar-client') !== '1') {
		return NextResponse.json(
			{ error: { code: 'MISSING_CLIENT_HEADER', message: 'x-meldar-client header required' } },
			{ status: 403 },
		)
	}

	const { projectId } = await context.params
	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response
	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const url = new URL(request.url)
	const sinceSeq = Math.max(0, Number.parseInt(url.searchParams.get('since') ?? '0', 10) || 0)
	const requestedRunId = url.searchParams.get('runId')

	const db = getDb()
	let runRow: { id: string; state: string } | null = null

	if (requestedRunId && runIdSchema.safeParse(requestedRunId).success) {
		const [row] = await db
			.select({ id: pipelineRuns.id, state: pipelineRuns.state })
			.from(pipelineRuns)
			.where(and(eq(pipelineRuns.id, requestedRunId), eq(pipelineRuns.projectId, projectId)))
			.limit(1)
		runRow = row ?? null
	} else {
		const [row] = await db
			.select({ id: pipelineRuns.id, state: pipelineRuns.state })
			.from(pipelineRuns)
			.where(eq(pipelineRuns.projectId, projectId))
			.orderBy(desc(pipelineRuns.startedAt))
			.limit(1)
		runRow = row ?? null
	}

	if (!runRow) {
		return NextResponse.json({ runId: null, events: [], active: false })
	}

	const events = await readPipelineEventsSince(runRow.id, sinceSeq, PIPELINE_EVENTS_READ_LIMIT)
	const active = (ACTIVE_STATES as readonly string[]).includes(runRow.state)
	return NextResponse.json({
		runId: runRow.id,
		events: events.map((e) => ({ seq: e.seq, type: e.type, payload: e.payload })),
		active,
	})
}
