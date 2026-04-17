import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import {
	PIPELINE_EVENTS_MAX_WAIT_MS,
	PIPELINE_EVENTS_POLL_INTERVAL_MS,
} from '@/server/build/timing'

type Options = {
	readonly intervalMs?: number
	readonly maxDurationMs?: number
	readonly fetchFn?: typeof fetch
}

type PipelineEventsResponse = {
	readonly runId: string | null
	readonly events: ReadonlyArray<{
		readonly seq: number
		readonly type: string
		readonly payload: unknown
	}>
	readonly active: boolean
}

const DEFAULT_INTERVAL_MS = PIPELINE_EVENTS_POLL_INTERVAL_MS
const DEFAULT_MAX_DURATION_MS = PIPELINE_EVENTS_MAX_WAIT_MS
const CONSECUTIVE_FAILURE_LIMIT = 5

export async function* subscribePipelineEvents(
	projectId: string,
	signal?: AbortSignal,
	opts: Options = {},
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const fetchFn = opts.fetchFn ?? fetch
	const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
	const maxDurationMs = opts.maxDurationMs ?? DEFAULT_MAX_DURATION_MS
	const deadline = Date.now() + maxDurationMs
	let lastSeq = 0
	let runId: string | null = null
	let consecutiveFailures = 0
	let sawAnyEvent = false

	while (Date.now() < deadline) {
		if (signal?.aborted) return
		await waitForVisible(signal)
		if (signal?.aborted) return
		const qs = new URLSearchParams({ since: String(lastSeq) })
		if (runId) qs.set('runId', runId)
		let res: Response
		try {
			res = await fetchFn(`/api/workspace/${projectId}/pipeline-events?${qs.toString()}`, {
				signal,
				headers: { 'x-meldar-client': '1' },
			})
		} catch {
			if (++consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
				yield disconnected('lost_contact', 'Connection dropped. Refresh to resync.')
				return
			}
			await sleep(intervalMs, signal)
			continue
		}
		if (!res.ok) {
			if (++consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
				yield disconnected('endpoint_unavailable', 'Connection dropped. Refresh to resync.')
				return
			}
			await sleep(intervalMs, signal)
			continue
		}
		consecutiveFailures = 0
		const body = (await res.json()) as PipelineEventsResponse
		if (!body.runId) {
			if (!sawAnyEvent) {
				yield disconnected('nothing_to_attach', 'No build is running right now.')
			}
			return
		}
		runId = body.runId
		for (const evt of body.events) {
			lastSeq = evt.seq
			sawAnyEvent = true
			yield evt.payload as OrchestratorEvent
		}
		if (!body.active) {
			if (!sawAnyEvent && body.events.length === 0) {
				yield disconnected('pipeline_gone', 'Build finished. Refresh to see it.')
			}
			return
		}
		await sleep(intervalMs, signal)
	}
	if (!sawAnyEvent) {
		yield disconnected('deadline', 'Still waiting — refresh to see the latest.')
	}
}

function disconnected(code: string, reason: string): OrchestratorEvent {
	return { type: 'disconnected', reason, code }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const id = setTimeout(resolve, ms)
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(id)
				resolve()
			},
			{ once: true },
		)
	})
}

function waitForVisible(signal?: AbortSignal): Promise<void> {
	if (typeof document === 'undefined' || !document.hidden) return Promise.resolve()
	return new Promise((resolve) => {
		let settled = false
		const settle = () => {
			if (settled) return
			settled = true
			document.removeEventListener('visibilitychange', handleVisibility)
			resolve()
		}
		const handleVisibility = () => {
			if (!document.hidden) settle()
		}
		signal?.addEventListener('abort', settle, { once: true })
		document.addEventListener('visibilitychange', handleVisibility)
		// TOCTOU: visibility may have flipped between the check above and listener
		// attachment. Without this recheck, waitForVisible would hang until the
		// next unrelated visibilitychange event.
		if (!document.hidden) settle()
	})
}
