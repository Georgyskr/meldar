'use client'

/**
 * BuildLog — pure renderer for an append-only stream of orchestrator events.
 *
 * No fetching, no state, no side effects. The parent (`BuildPanel`) owns the
 * event list and the streaming flag and passes them down. This split keeps
 * the renderer trivially testable and lets the panel evolve its data
 * source (SSE today, websockets later, paginated history view some day)
 * without touching the visual layer.
 */

import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { Box, styled, VStack } from '@styled-system/jsx'

/**
 * Build events are append-only and never reorder, so the parent tags each
 * one with a monotonic id at insertion time. This is the stable React key —
 * the array index would be footgunny if the panel ever cleared and refilled
 * the list between renders.
 */
export type LoggedEvent = {
	readonly id: number
	readonly event: OrchestratorEvent
}

export type BuildLogProps = {
	readonly events: readonly LoggedEvent[]
	readonly streaming: boolean
}

export function BuildLog({ events, streaming }: BuildLogProps) {
	return (
		<VStack alignItems="stretch" padding={4} gap={3}>
			<styled.h3 textStyle="heading.sm" color="onSurface" fontWeight="600" marginBlockEnd={1}>
				Build log
			</styled.h3>

			{events.length === 0 && !streaming && <EmptyState />}

			{events.map(({ id, event }) => (
				<EventRow key={id} event={event} />
			))}

			{streaming && (
				<styled.div
					padding={2}
					borderRadius="sm"
					background="surfaceContainer"
					textStyle="body.xs"
					color="onSurfaceVariant"
				>
					Streaming…
				</styled.div>
			)}
		</VStack>
	)
}

function EmptyState() {
	return (
		<Box padding={4} borderRadius="md" border="1px dashed" borderColor="outlineVariant/40">
			<styled.p textStyle="body.xs" color="onSurfaceVariant" lineHeight="1.5">
				This is where your build progress will stream in real time. Once you submit your first
				prompt, you'll see each file Meldar writes appear here.
			</styled.p>
		</Box>
	)
}

function EventRow({ event }: { event: OrchestratorEvent }) {
	return (
		<Box
			padding={2}
			borderRadius="sm"
			background="surfaceContainer"
			borderInlineStart="3px solid"
			borderColor={colorForEvent(event.type)}
		>
			<styled.div
				textStyle="body.xs"
				color="onSurface"
				fontFamily="mono"
				whiteSpace="pre-wrap"
				wordBreak="break-word"
			>
				{labelForEvent(event)}
			</styled.div>
		</Box>
	)
}

function colorForEvent(type: OrchestratorEvent['type']): string {
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

function labelForEvent(event: OrchestratorEvent): string {
	switch (event.type) {
		case 'started':
			return `▶ Build started (${event.buildId.slice(0, 8)})`
		case 'prompt_sent':
			return `→ Prompt sent (~${event.estimatedCents}¢ estimate)`
		case 'file_written':
			return `📄 ${event.path} (${formatBytes(event.sizeBytes)})`
		case 'committed':
			return `✓ Committed: ${event.fileCount} files, ${event.actualCents}¢ (${event.tokenCost} tokens)`
		case 'failed':
			return `✗ Failed: ${event.reason}`
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
	return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
