import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'

export function handleSseEvent(
	event: OrchestratorEvent,
	publish: (e: OrchestratorEvent) => void,
): void {
	publish(event)

	if (event.type === 'failed') {
		// Race condition: another build was already streaming. No toast — the UI
		// will pick up the other build's stream. But still log at warn level so
		// the signal isn't lost for diagnostics.
		if (event.code === 'BuildInProgressError' || event.code === 'build_in_progress') {
			console.warn(`[runBuild] SSE skipped (build in progress): ${event.reason}`)
			return
		}
		// Domain-level failure surfaced via toast — not a JS error. Use warn so
		// E2E console-error assertions don't trip on expected failure paths.
		console.warn(`[runBuild] SSE failed: ${event.code ?? 'UNKNOWN'}: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}

	if (event.type === 'pipeline_failed') {
		console.warn(`[runBuild] pipeline failed: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}
}
