import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'

export function handleSseEvent(
	event: OrchestratorEvent,
	publish: (e: OrchestratorEvent) => void,
): void {
	publish(event)

	if (event.type === 'failed') {
		console.error(`[runBuild] SSE failed: ${event.code ?? 'UNKNOWN'}: ${event.reason}`)
		toast.error('Build failed', event.reason)
	}

	if (event.type === 'pipeline_failed') {
		console.error(`[runBuild] pipeline failed: ${event.reason}`)
		toast.error('Build failed', event.reason)
	}
}
