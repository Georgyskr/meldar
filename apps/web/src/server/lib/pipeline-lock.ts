import { getDb } from '@meldar/db/client'
import { pipelineRuns } from '@meldar/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import {
	MAX_ERROR_CODE_LEN,
	MAX_ERROR_REASON_LEN,
	STALE_HEARTBEAT_THRESHOLD_MS,
} from '@/server/build/timing'

const ACTIVE_STATES = ['running', 'deploying'] as const

export type PipelineKind = 'single' | 'auto'

export type AcquireResult =
	| { readonly ok: true; readonly pipelineId: string }
	| { readonly ok: false; readonly reason: 'project_not_found' | 'pipeline_active' }

export type ActivePipelineInfo = {
	readonly id: string
	readonly kind: PipelineKind
	readonly state: 'running' | 'deploying'
	readonly startedAt: Date
	readonly currentCardId: string | null
	readonly totalCards: number | null
}

export async function startPipelineRun(
	projectId: string,
	userId: string,
	kind: PipelineKind,
): Promise<AcquireResult> {
	const db = getDb()
	const staleBefore = new Date(Date.now() - STALE_HEARTBEAT_THRESHOLD_MS)
	await db
		.update(pipelineRuns)
		.set({ state: 'cancelled', endedAt: new Date(), errorCode: 'heartbeat_stale' })
		.where(
			and(
				eq(pipelineRuns.projectId, projectId),
				inArray(pipelineRuns.state, [...ACTIVE_STATES]),
				sql`${pipelineRuns.heartbeatAt} < ${staleBefore}`,
			),
		)

	try {
		const [row] = await db
			.insert(pipelineRuns)
			.values({ projectId, userId, kind, state: 'running' })
			.returning({ id: pipelineRuns.id })
		console.log(
			JSON.stringify({
				event: 'pipeline_run.acquired',
				pipelineId: row.id,
				projectId,
				userId,
				kind,
			}),
		)
		return { ok: true, pipelineId: row.id }
	} catch (err) {
		if (isUniqueViolation(err)) {
			console.log(
				JSON.stringify({
					event: 'pipeline_run.acquire_rejected',
					projectId,
					userId,
					kind,
					reason: 'pipeline_active',
				}),
			)
			return { ok: false, reason: 'pipeline_active' }
		}
		if (isForeignKeyViolation(err)) {
			return { ok: false, reason: 'project_not_found' }
		}
		throw err
	}
}

export async function heartbeatPipelineRun(pipelineId: string): Promise<void> {
	const db = getDb()
	await db
		.update(pipelineRuns)
		.set({ heartbeatAt: new Date() })
		.where(and(eq(pipelineRuns.id, pipelineId), inArray(pipelineRuns.state, [...ACTIVE_STATES])))
}

export async function endPipelineRun(
	pipelineId: string,
	state: 'succeeded' | 'failed' | 'cancelled',
	options: { errorCode?: string; errorReason?: string } = {},
): Promise<void> {
	const db = getDb()
	const errorCode = options.errorCode?.slice(0, MAX_ERROR_CODE_LEN) ?? null
	const errorReason = options.errorReason?.slice(0, MAX_ERROR_REASON_LEN) ?? null
	const result = await db
		.update(pipelineRuns)
		.set({ state, endedAt: new Date(), errorCode, errorReason })
		.where(and(eq(pipelineRuns.id, pipelineId), inArray(pipelineRuns.state, [...ACTIVE_STATES])))
		.returning({ id: pipelineRuns.id, startedAt: pipelineRuns.startedAt })
	const row = result[0]
	if (row) {
		console.log(
			JSON.stringify({
				event: 'pipeline_run.ended',
				pipelineId,
				state,
				errorCode,
				durationMs: Date.now() - row.startedAt.getTime(),
			}),
		)
	} else {
		console.log(
			JSON.stringify({
				event: 'pipeline_run.end_noop',
				pipelineId,
				cause: 'already_terminal_or_reclaimed',
			}),
		)
	}
}

export async function transitionToDeploying(pipelineId: string): Promise<void> {
	const db = getDb()
	await db
		.update(pipelineRuns)
		.set({ state: 'deploying', heartbeatAt: new Date() })
		.where(and(eq(pipelineRuns.id, pipelineId), eq(pipelineRuns.state, 'running')))
}

export async function findActivePipelineRun(projectId: string): Promise<ActivePipelineInfo | null> {
	const db = getDb()
	const staleBefore = new Date(Date.now() - STALE_HEARTBEAT_THRESHOLD_MS)
	const [row] = await db
		.select({
			id: pipelineRuns.id,
			kind: pipelineRuns.kind,
			state: pipelineRuns.state,
			startedAt: pipelineRuns.startedAt,
			currentCardId: pipelineRuns.currentCardId,
			totalCards: pipelineRuns.totalCards,
		})
		.from(pipelineRuns)
		.where(
			and(
				eq(pipelineRuns.projectId, projectId),
				inArray(pipelineRuns.state, [...ACTIVE_STATES]),
				sql`${pipelineRuns.heartbeatAt} >= ${staleBefore}`,
			),
		)
		.limit(1)
	if (!row) return null
	return {
		id: row.id,
		kind: row.kind as PipelineKind,
		state: row.state as 'running' | 'deploying',
		startedAt: row.startedAt,
		currentCardId: row.currentCardId,
		totalCards: row.totalCards,
	}
}

function errCode(err: unknown): string | null {
	if (typeof err !== 'object' || err === null) return null
	const direct = (err as { code?: unknown }).code
	if (typeof direct === 'string') return direct
	const cause = (err as { cause?: unknown }).cause
	if (cause && typeof cause === 'object' && 'code' in cause) {
		const c = (cause as { code?: unknown }).code
		if (typeof c === 'string') return c
	}
	const msg = (err as { message?: unknown }).message
	if (typeof msg === 'string' && msg.includes('duplicate key value violates unique constraint'))
		return '23505'
	if (typeof msg === 'string' && msg.includes('violates foreign key constraint')) return '23503'
	return null
}

function isUniqueViolation(err: unknown): boolean {
	return errCode(err) === '23505'
}

function isForeignKeyViolation(err: unknown): boolean {
	return errCode(err) === '23503'
}
