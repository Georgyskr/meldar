import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { toast } from '@/shared/ui'

export function handleSseEvent(
	event: OrchestratorEvent,
	publish: (e: OrchestratorEvent) => void,
): void {
	if (
		event.type === 'failed' &&
		(event.code === 'BuildInProgressError' || event.code === 'build_in_progress')
	) {
		// Losing side of the SQL partial-unique-index arbitration. The winning
		// stream owns the UI; suppressing entirely (no publish, no toast) avoids
		// flashing a red failure pill from the doomed race.
		console.warn(`[runBuild] SSE skipped (build in progress): ${event.reason}`)
		return
	}

	publish(event)

	if (event.type === 'failed') {
		console.warn(`[runBuild] SSE failed: ${event.code ?? 'UNKNOWN'}: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}

	if (event.type === 'pipeline_failed') {
		console.warn(`[runBuild] pipeline failed: ${event.reason}`)
		toast.error('Something went sideways', event.reason)
	}
}
