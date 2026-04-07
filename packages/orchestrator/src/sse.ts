/**
 * SSE encoder for {@link OrchestratorEvent}.
 *
 * Pulled out into its own module so the encoding boundary is independently
 * testable and the route + client share the same wire format. The shape is
 * the canonical W3C Server-Sent Events format:
 *
 *   event: <type>\n
 *   data:  <json>\n
 *   \n
 *
 * Two design choices worth understanding:
 *
 * 1. The JSON body is the FULL event including its `type` field. This is
 *    redundant with the `event:` line, but it lets the client choose between
 *    EventSource (which dispatches per `event:` name) and a raw stream parser
 *    (which only needs the `data:` body) without changing the server. The
 *    workspace UI uses the raw parser because EventSource is GET-only.
 *
 * 2. We always end with a single empty line, even on the last event. The
 *    client's split-on-double-newline parser depends on it. The route appends
 *    one final `data: [DONE]\n\n` sentinel after the orchestrator generator
 *    drains so the client can distinguish "stream ended cleanly" from
 *    "connection dropped mid-stream."
 */

import type { OrchestratorEvent } from './types'

/** SSE wire-format sentinel that marks "the orchestrator generator drained cleanly." */
export const SSE_DONE_SENTINEL = '[DONE]'

/**
 * Format a single orchestrator event as an SSE frame. Returns a string ready
 * to be UTF-8 encoded into a ReadableStream.
 *
 * The output always ends with `\n\n` — the SSE record separator. Concatenating
 * multiple `formatSseEvent` results back-to-back yields a valid SSE stream.
 */
export function formatSseEvent(event: OrchestratorEvent): string {
	// JSON.stringify is safe for OrchestratorEvent — every field is a primitive
	// or an object of primitives. No Date, no Map, no circular refs.
	const json = JSON.stringify(event)
	return `event: ${event.type}\ndata: ${json}\n\n`
}

/**
 * The terminal frame that signals "stream ended cleanly, no more events."
 * The client treats this as authoritative — anything that arrives after is
 * ignored. Without it, the client cannot distinguish a clean end from a
 * dropped connection.
 */
export function formatSseDone(): string {
	return `event: done\ndata: ${SSE_DONE_SENTINEL}\n\n`
}

/**
 * Parse a single SSE record (a string of `key: value` lines) into a typed
 * OrchestratorEvent. Returns `null` for the [DONE] sentinel and throws for
 * malformed records.
 *
 * This is the dual of {@link formatSseEvent}: route → wire → client →
 * `parseSseRecord` → typed event again. Sharing the encode/decode boundary
 * here is what keeps the route and the client honest about the schema.
 */
export function parseSseRecord(record: string): OrchestratorEvent | null {
	const dataLines: string[] = []
	for (const rawLine of record.split('\n')) {
		const line = rawLine.trimEnd()
		if (line === '' || line.startsWith(':')) continue
		const colonIdx = line.indexOf(':')
		if (colonIdx === -1) continue
		const field = line.slice(0, colonIdx)
		// Per spec the value optionally has a leading space we strip.
		let value = line.slice(colonIdx + 1)
		if (value.startsWith(' ')) value = value.slice(1)
		if (field === 'data') dataLines.push(value)
		// `event:` and other fields are ignored — the JSON body is authoritative.
	}
	if (dataLines.length === 0) {
		throw new Error('SSE record contained no data: lines')
	}
	const dataPayload = dataLines.join('\n')
	if (dataPayload === SSE_DONE_SENTINEL) return null
	const parsed = JSON.parse(dataPayload) as OrchestratorEvent
	return parsed
}

/**
 * Consume a `ReadableStream<Uint8Array>` (the body of an `fetch` response)
 * as an async iterable of {@link OrchestratorEvent}s.
 *
 * Handles the three things any SSE consumer must handle:
 *
 * 1. **Chunk reassembly** — TCP/HTTP gives you arbitrary byte boundaries; SSE
 *    records end with `\n\n`. Buffer until you see one, then process.
 * 2. **The [DONE] sentinel** — emitted by the server's `formatSseDone()`. When
 *    we see it, we stop iterating even if more bytes arrive (shouldn't happen,
 *    but a misbehaving proxy could append junk).
 * 3. **Cancellation** — caller passes an `AbortSignal`; we exit the read loop
 *    and `cancel()` the underlying reader so the connection closes promptly.
 *
 * The async generator pattern means callers can write:
 *
 * ```ts
 * for await (const event of consumeSseStream(response.body!, signal)) { ... }
 * ```
 *
 * which mirrors how the orchestrator engine itself yields events. The
 * symmetry is the point — the wire format is the only thing in between.
 */
export async function* consumeSseStream(
	stream: ReadableStream<Uint8Array>,
	signal?: AbortSignal,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const reader = stream.getReader()
	const decoder = new TextDecoder('utf-8')
	let buffer = ''

	try {
		while (true) {
			if (signal?.aborted) return
			const { done, value } = await reader.read()
			if (done) {
				// Flush any tail. A clean stream ends with [DONE]\n\n which is
				// a complete record, so the buffer is normally empty here.
				if (buffer.trim().length > 0) {
					const parsed = parseSseRecord(buffer)
					if (parsed !== null) yield parsed
				}
				return
			}
			buffer += decoder.decode(value, { stream: true })

			// Records are separated by `\n\n`. Process every complete record we
			// have so far; keep the (possibly partial) tail in the buffer for
			// the next read.
			let separatorIdx = buffer.indexOf('\n\n')
			while (separatorIdx !== -1) {
				const record = buffer.slice(0, separatorIdx)
				buffer = buffer.slice(separatorIdx + 2)
				if (record.length > 0) {
					const parsed = parseSseRecord(record)
					if (parsed === null) {
						// [DONE] sentinel: clean end of stream.
						return
					}
					yield parsed
				}
				separatorIdx = buffer.indexOf('\n\n')
			}
		}
	} finally {
		// `cancel()` first awaits any in-flight read, then releases the lock.
		// We swallow errors because we're already on the exit path.
		try {
			await reader.cancel()
		} catch {
			// Already cancelled or stream already closed — fine.
		}
	}
}
