'use client'

import { consumeSseStream } from '@meldar/orchestrator/sse'
import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { Box, Flex, styled } from '@styled-system/jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BuildComposer } from './BuildComposer'
import { BuildLog, type LoggedEvent } from './BuildLog'
import { useWorkspaceBuild } from './context'

export type BuildPanelProps = {
	readonly projectId: string
	readonly blockedByBuildId?: string | null
}

export function BuildPanel({ projectId, blockedByBuildId = null }: BuildPanelProps) {
	const { publish } = useWorkspaceBuild()
	const [events, setEvents] = useState<readonly LoggedEvent[]>([])
	const [streaming, setStreaming] = useState(false)
	const nextIdRef = useRef(0)
	const abortRef = useRef<AbortController | null>(null)
	const blocked = blockedByBuildId !== null

	const pushEvent = useCallback(
		(event: OrchestratorEvent) => {
			setEvents((prev) => [...prev, { id: nextIdRef.current++, event }])
			publish(event)
		},
		[publish],
	)

	useEffect(() => {
		return () => {
			abortRef.current?.abort()
		}
	}, [])

	const handleSubmit = useCallback(
		async (prompt: string) => {
			abortRef.current?.abort()
			const ctrl = new AbortController()
			abortRef.current = ctrl
			setStreaming(true)

			try {
				const response = await fetch(`/api/workspace/${projectId}/build`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt }),
					signal: ctrl.signal,
				})

				if (!response.ok) {
					let message: string
					try {
						const json = (await response.json()) as { error?: { message?: string } }
						message = json.error?.message ?? `HTTP ${response.status}`
					} catch {
						message = `HTTP ${response.status}`
					}
					pushEvent({
						type: 'failed',
						reason: message,
						code: `http_${response.status}`,
					})
					return
				}

				if (!response.body) {
					pushEvent({
						type: 'failed',
						reason: 'Server returned no response body',
						code: 'empty_body',
					})
					return
				}

				for await (const event of consumeSseStream(response.body, ctrl.signal)) {
					pushEvent(event)
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return
				const reason = err instanceof Error ? err.message : String(err)
				pushEvent({
					type: 'failed',
					reason: `Network error: ${reason}`,
					code: 'fetch_error',
				})
			} finally {
				setStreaming(false)
				abortRef.current = null
			}
		},
		[projectId, pushEvent],
	)

	return (
		<Flex direction="column" height="100%">
			{blocked && <BlockedBanner />}
			<Flex flex="1" overflowY="auto">
				<BuildLog events={events} streaming={streaming} />
			</Flex>
			<BuildComposer disabled={streaming || blocked} onSubmit={handleSubmit} />
		</Flex>
	)
}

function BlockedBanner() {
	return (
		<Box
			padding={3}
			bg="surfaceContainerHigh"
			borderBlockEnd="1px solid"
			borderColor="outlineVariant/40"
		>
			<styled.p textStyle="body.xs" color="onSurface" lineHeight="1.5" fontWeight="500">
				A build is already running for this project — possibly in another tab. Wait for it to
				finish, then reload to keep working.
			</styled.p>
		</Box>
	)
}
