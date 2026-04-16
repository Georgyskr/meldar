import { getDb } from '@meldar/db/client'
import { pipelineEvents } from '@meldar/db/schema'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export const MAX_PAYLOAD_BYTES = 64 * 1024

const MAX_APPEND_RETRIES = 5

export type AppendOptions = {
	readonly runId: string
	readonly type: string
	readonly payload: unknown
}

export async function appendPipelineEvent(opts: AppendOptions): Promise<number> {
	const db = getDb()
	const payload = capPayload(opts.payload)
	let lastErr: unknown
	for (let attempt = 0; attempt < MAX_APPEND_RETRIES; attempt++) {
		try {
			const [row] = await db
				.insert(pipelineEvents)
				.values({
					runId: opts.runId,
					seq: sql`COALESCE((SELECT MAX(${pipelineEvents.seq}) FROM ${pipelineEvents} WHERE ${pipelineEvents.runId} = ${opts.runId}), 0) + 1`,
					type: opts.type,
					payload,
				})
				.returning({ seq: pipelineEvents.seq })
			return row.seq
		} catch (err) {
			lastErr = err
			if (!isUniqueViolation(err)) throw err
		}
	}
	throw new Error(
		`appendPipelineEvent exhausted ${MAX_APPEND_RETRIES} retries on run ${opts.runId}: ${String(lastErr)}`,
	)
}

export type StoredPipelineEvent = {
	readonly seq: number
	readonly type: string
	readonly payload: unknown
	readonly createdAt: Date
}

export const DEFAULT_EVENT_READ_LIMIT = 500

export async function readPipelineEventsSince(
	runId: string,
	sinceSeq: number,
	limit: number = DEFAULT_EVENT_READ_LIMIT,
): Promise<readonly StoredPipelineEvent[]> {
	const db = getDb()
	const rows = await db
		.select({
			seq: pipelineEvents.seq,
			type: pipelineEvents.type,
			payload: pipelineEvents.payload,
			createdAt: pipelineEvents.createdAt,
		})
		.from(pipelineEvents)
		.where(and(eq(pipelineEvents.runId, runId), gt(pipelineEvents.seq, sinceSeq)))
		.orderBy(pipelineEvents.seq)
		.limit(limit)
	return rows.map((r) => ({
		seq: r.seq,
		type: r.type,
		payload: r.payload,
		createdAt: r.createdAt,
	}))
}

export async function getLatestSeq(runId: string): Promise<number> {
	const db = getDb()
	const [row] = await db
		.select({ seq: pipelineEvents.seq })
		.from(pipelineEvents)
		.where(eq(pipelineEvents.runId, runId))
		.orderBy(desc(pipelineEvents.seq))
		.limit(1)
	return row?.seq ?? 0
}

const HEAVY_KEYS = ['content', 'body', 'reason', 'stack', 'output', 'text']
const HEAVY_KEY_MAX = 2_000

function capPayload(payload: unknown): Record<string, unknown> {
	if (JSON.stringify(payload).length <= MAX_PAYLOAD_BYTES) {
		return (
			typeof payload === 'object' && payload !== null ? payload : { value: payload }
		) as Record<string, unknown>
	}
	const obj: Record<string, unknown> =
		typeof payload === 'object' && payload !== null
			? { ...(payload as Record<string, unknown>) }
			: { value: String(payload) }
	for (const key of HEAVY_KEYS) {
		const val = obj[key]
		if (typeof val === 'string' && val.length > HEAVY_KEY_MAX) {
			obj[key] = `${val.slice(0, HEAVY_KEY_MAX)}\u2026[truncated, original ${val.length} chars]`
		}
	}
	obj._truncated = true
	if (JSON.stringify(obj).length > MAX_PAYLOAD_BYTES) {
		return { _truncated: true, type: obj.type ?? 'unknown' }
	}
	return obj
}

function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false
	const direct = (err as { code?: unknown }).code
	if (direct === '23505') return true
	const cause = (err as { cause?: unknown }).cause
	if (
		cause &&
		typeof cause === 'object' &&
		'code' in cause &&
		(cause as { code?: unknown }).code === '23505'
	)
		return true
	const msg = (err as { message?: unknown }).message
	return typeof msg === 'string' && msg.includes('duplicate key value violates unique constraint')
}
