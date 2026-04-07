'use client'

/**
 * BuildPanel — the stateful right-pane of the workspace.
 *
 * Owns:
 *   - the append-only LoggedEvent[] state
 *   - the streaming flag
 *   - the prompt-submission lifecycle (POST → consume SSE → push events)
 *   - cancellation via AbortController
 *
 * Renders <BuildComposer> + <BuildLog>. Both are pure presentational; this
 * component is the only place that touches `fetch`.
 *
 * The SSE consumption uses `consumeSseStream` from the orchestrator's `sse`
 * module — that's the same module the server uses to encode events, so the
 * wire format is end-to-end type-safe (every event yielded here is a typed
 * `OrchestratorEvent`, validated structurally by being parsed back from JSON).
 *
 * Why import directly from `@meldar/orchestrator/sse` and not the barrel:
 * the barrel re-exports server-only modules (engine, deps, prompts) that pull
 * in Anthropic SDK, Drizzle, Postgres drivers, etc. Tree-shaking is supposed
 * to drop them on the client, but the barrel has module-level state in
 * `deps.ts` (the cached deps object) which can defeat shaking. Importing the
 * leaf module directly guarantees the client bundle stays minimal.
 */

import { consumeSseStream } from '@meldar/orchestrator/sse'
import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { Flex } from '@styled-system/jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BuildComposer } from './BuildComposer'
import { BuildLog, type LoggedEvent } from './BuildLog'

export type BuildPanelProps = {
	readonly projectId: string
}

export function BuildPanel({ projectId }: BuildPanelProps) {
	const [events, setEvents] = useState<readonly LoggedEvent[]>([])
	const [streaming, setStreaming] = useState(false)
	const nextIdRef = useRef(0)
	const abortRef = useRef<AbortController | null>(null)

	const pushEvent = useCallback((event: OrchestratorEvent) => {
		setEvents((prev) => [...prev, { id: nextIdRef.current++, event }])
	}, [])

	// Abort any in-flight build if this component unmounts (e.g. navigating
	// away from the workspace mid-build). The orchestrator's API route reads
	// `request.signal.aborted` and breaks out of its for-await loop, which
	// trips the ReadableStream's `cancel()` and asks the generator to return.
	useEffect(() => {
		return () => {
			abortRef.current?.abort()
		}
	}, [])

	const handleSubmit = useCallback(
		async (prompt: string) => {
			// Defensive: if a previous build is somehow still streaming when a
			// new submit lands, cancel it first. The composer disables submit
			// while `streaming` is true, but local state can race during a
			// hot reload or a fast-typing user.
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
					// Pre-stream errors (auth, validation, rate limit, deps misconfig)
					// come back as JSON, not SSE. Surface them as a synthetic failed
					// event so they show up in the same log the user is already
					// looking at.
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
				// AbortError is the expected exit on unmount/cancel — don't surface it.
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
			<Flex flex="1" overflowY="auto">
				<BuildLog events={events} streaming={streaming} />
			</Flex>
			<BuildComposer disabled={streaming} onSubmit={handleSubmit} />
		</Flex>
	)
}
