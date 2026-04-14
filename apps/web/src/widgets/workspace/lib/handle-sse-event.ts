import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'

export function handleSseEvent(
	event: OrchestratorEvent,
	publish: (e: OrchestratorEvent) => void,
): void {
	publish(event)

	if (event.type === 'failed') {
		// Race condition: another build was already streaming. Silent no-op —
		// the UI is picking up the other build's stream.
		if (event.code === 'BuildInProgressError' || event.code === 'build_in_progress') return
		console.error(`[runBuild] SSE failed: ${event.code ?? 'UNKNOWN'}: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}

	if (event.type === 'pipeline_failed') {
		console.error(`[runBuild] pipeline failed: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}
}
