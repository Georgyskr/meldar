import { consumeSseStream } from '@meldar/orchestrator'
import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'
import { handleSseEvent } from './handle-sse-event'

export const BUILD_RETRY_MAX_ATTEMPTS = 4
export const BUILD_RETRY_DELAY_MS = 2000

type Publish = (event: OrchestratorEvent) => void

type Options = {
	readonly fetchFn?: typeof fetch
	readonly sleep?: (ms: number) => Promise<void>
	readonly maxAttempts?: number
	readonly delayMs?: number
}

export async function runBuild(
	projectId: string,
	cardId: string | undefined,
	prompt: string,
	publish: Publish,
	opts: Options = {},
	attempt = 0,
): Promise<void> {
	const fetchFn = opts.fetchFn ?? fetch
	const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
	const maxAttempts = opts.maxAttempts ?? BUILD_RETRY_MAX_ATTEMPTS
	const delayMs = opts.delayMs ?? BUILD_RETRY_DELAY_MS

	try {
		const body: Record<string, string> = { prompt }
		if (cardId) body.kanbanCardId = cardId

		const response = await fetchFn(`/api/workspace/${projectId}/build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			if (response.status === 409 && attempt + 1 < maxAttempts) {
				console.warn(`[runBuild] 409 BUILD_IN_PROGRESS (attempt ${attempt + 1}/${maxAttempts})`)
				await sleep(delayMs)
				return runBuild(projectId, cardId, prompt, publish, opts, attempt + 1)
			}
			const errorBody = (await response.json().catch(() => ({}))) as {
				error?: { code?: string; message?: string }
			}
			const code = errorBody.error?.code ?? 'UNKNOWN'
			const message = errorBody.error?.message ?? `Build failed (${response.status})`
			console.error(`[runBuild] ${code}: ${message} (HTTP ${response.status})`)
			toast.error('Something went sideways', message)
			publish({ type: 'failed', reason: message, kanbanCardId: cardId })
			return
		}

		if (!response.body) {
			const reason = 'Server returned no stream.'
			console.error(`[runBuild] ${reason}`)
			toast.error('Something went sideways', reason)
			publish({ type: 'failed', reason, kanbanCardId: cardId })
			return
		}

		let sawBuildInProgress = false
		for await (const event of consumeSseStream(response.body)) {
			if (
				event.type === 'failed' &&
				(event.code === 'build_in_progress' || event.code === 'BuildInProgressError')
			) {
				sawBuildInProgress = true
				continue
			}
			handleSseEvent(event, publish)
		}

		if (sawBuildInProgress && attempt + 1 < maxAttempts) {
			console.warn(
				`[runBuild] SSE build_in_progress (attempt ${attempt + 1}/${maxAttempts}) — retrying`,
			)
			await sleep(delayMs)
			return runBuild(projectId, cardId, prompt, publish, opts, attempt + 1)
		}
		if (sawBuildInProgress) {
			const reason = 'Another build kept running after several retries.'
			toast.error('Something went sideways', reason)
			publish({ type: 'failed', reason, kanbanCardId: cardId })
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Network error'
		console.error('[runBuild] exception:', err)
		toast.error('Build failed', message)
		publish({ type: 'failed', reason: message, kanbanCardId: cardId })
	}
}
