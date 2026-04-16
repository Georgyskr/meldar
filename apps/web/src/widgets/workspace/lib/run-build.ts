import { consumeSseStream } from '@meldar/orchestrator'
import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'
import { handleSseEvent } from './handle-sse-event'
import { subscribePipelineEvents } from './subscribe-pipeline-events'

type Publish = (event: OrchestratorEvent) => void

type Options = {
	readonly fetchFn?: typeof fetch
	readonly signal?: AbortSignal
}

export async function runBuild(
	projectId: string,
	cardId: string | undefined,
	prompt: string,
	publish: Publish,
	opts: Options = {},
): Promise<void> {
	const fetchFn = opts.fetchFn ?? fetch
	try {
		const body: Record<string, string> = { prompt }
		if (cardId) body.kanbanCardId = cardId

		const response = await fetchFn(`/api/workspace/${projectId}/build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: opts.signal,
		})

		if (response.status === 409) {
			toast.info(
				'Setup still running',
				'Your prompt is saved. We\u2019ll pick it up as soon as the current run finishes.',
			)
			for await (const event of subscribePipelineEvents(projectId, opts.signal)) {
				handleSseEvent(event, publish)
			}
			return
		}

		if (!response.ok) {
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

		for await (const event of consumeSseStream(response.body)) {
			handleSseEvent(event, publish)
		}
	} catch (err) {
		if (opts.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
			return
		}
		const message = err instanceof Error ? err.message : 'Network error'
		console.error('[runBuild] exception:', err)
		toast.error('Build failed', message)
		publish({ type: 'failed', reason: message, kanbanCardId: cardId })
	}
}
