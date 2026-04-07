import type { OrchestratorEvent } from '@meldar/orchestrator/types'

export function colorForEvent(type: OrchestratorEvent['type']): string {
	switch (type) {
		case 'started':
			return 'primary'
		case 'prompt_sent':
			return 'primary'
		case 'file_written':
			return 'tertiary'
		case 'committed':
			return 'green.500'
		case 'failed':
			return 'red.500'
		default:
			return 'outline'
	}
}

export function labelForEvent(event: OrchestratorEvent): string {
	switch (event.type) {
		case 'started':
			return `▶ Build started (${event.buildId.slice(0, 8)})`
		case 'prompt_sent':
			return `→ Prompt sent (~${event.estimatedCents}¢ estimate)`
		case 'file_written':
			return `📄 ${event.path} (${formatBytes(event.sizeBytes)})`
		case 'sandbox_ready':
			return `🟢 Preview live (revision ${event.revision})`
		case 'committed':
			return `✓ Committed: ${event.fileCount} files, ${event.actualCents}¢ (${event.tokenCost} tokens)`
		case 'failed':
			return `✗ Failed: ${event.reason}`
	}
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
	return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
