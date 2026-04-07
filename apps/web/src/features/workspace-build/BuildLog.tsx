'use client'

import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { Box, styled, VStack } from '@styled-system/jsx'
import { memo } from 'react'
import { colorForEvent, labelForEvent } from './lib/build-log-format'

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

const EventRow = memo(function EventRow({ event }: { event: OrchestratorEvent }) {
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
})
