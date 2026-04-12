/**
 * Tests for the orchestrator's SSE encode/decode/consume helpers.
 *
 * This is the wire-format boundary between the route handler and the
 * workspace UI. If any of these tests fail, the orchestrator's events stop
 * reaching the user — even if the engine itself is working perfectly.
 */

import { describe, expect, it, vi } from 'vitest'
import {
	consumeSseStream,
	formatSseDone,
	formatSseEvent,
	parseSseRecord,
	SSE_DONE_SENTINEL,
} from '../sse'
import type { OrchestratorEvent } from '../types'

/**
 * Create a `ReadableStream<Uint8Array>` from one or more text chunks. Each
 * chunk is enqueued as its own pull, simulating real network chunking
 * (where TCP slices are arbitrary).
 */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	let i = 0
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (i >= chunks.length) {
				controller.close()
				return
			}
			controller.enqueue(encoder.encode(chunks[i]))
			i += 1
		},
	})
}

async function collectStream(
	gen: AsyncGenerator<OrchestratorEvent, void, unknown>,
): Promise<OrchestratorEvent[]> {
	const out: OrchestratorEvent[] = []
	for await (const ev of gen) out.push(ev)
	return out
}

describe('formatSseEvent + parseSseRecord roundtrip', () => {
	const cases: OrchestratorEvent[] = [
		{ type: 'started', buildId: 'b_123', projectId: 'p_456' },
		{ type: 'prompt_sent', promptHash: 'abc123', estimatedCents: 4 },
		{
			type: 'file_written',
			path: 'src/app/page.tsx',
			contentHash: 'sha256-deadbeef',
			sizeBytes: 1024,
			fileIndex: 0,
		},
		{
			type: 'committed',
			buildId: 'b_123',
			tokenCost: 1500,
			actualCents: 6,
			fileCount: 3,
		},
		{ type: 'failed', reason: 'something exploded', code: 'unhandled', buildId: 'b_123' },
	]

	for (const original of cases) {
		it(`roundtrips a ${original.type} event`, () => {
			const wire = formatSseEvent(original)
			expect(wire).toMatch(/^event: /)
			expect(wire).toMatch(/\ndata: /)
			expect(wire.endsWith('\n\n')).toBe(true)

			const parsed = parseSseRecord(wire.trimEnd())
			expect(parsed).toEqual(original)
		})
	}

	it('preserves special characters in strings', () => {
		const event: OrchestratorEvent = {
			type: 'failed',
			reason: 'line one\nline two\nwith "quotes" and: colons',
			code: 'edge',
		}
		const wire = formatSseEvent(event)
		const parsed = parseSseRecord(wire.trimEnd())
		expect(parsed).toEqual(event)
	})

	it('encodes the type field on the SSE event line', () => {
		const event: OrchestratorEvent = {
			type: 'file_written',
			path: 'a',
			contentHash: 'b',
			sizeBytes: 1,
			fileIndex: 0,
		}
		expect(formatSseEvent(event).startsWith('event: file_written\n')).toBe(true)
	})
})

describe('parseSseRecord', () => {
	it('returns null for the [DONE] sentinel', () => {
		const record = `event: done\ndata: ${SSE_DONE_SENTINEL}`
		expect(parseSseRecord(record)).toBeNull()
	})

	it('throws if the record has no data: lines', () => {
		expect(() => parseSseRecord('event: failed\n')).toThrow(/no data/i)
	})

	it('strips the optional leading space after the colon', () => {
		// Both `data:foo` and `data: foo` are valid SSE; the leading space is
		// optional and should be stripped if present.
		const record = `data: ${JSON.stringify({ type: 'failed', reason: 'x' })}`
		const parsed = parseSseRecord(record)
		expect(parsed).toEqual({ type: 'failed', reason: 'x' })
	})

	it('ignores comment lines (starting with `:`)', () => {
		const record = `:keep-alive\nevent: failed\ndata: ${JSON.stringify({
			type: 'failed',
			reason: 'x',
		})}`
		expect(parseSseRecord(record)).toEqual({ type: 'failed', reason: 'x' })
	})

	it('joins multiple data: lines with newlines', () => {
		// SSE lets a server split a JSON value across multiple data: lines.
		// We don't emit them that way, but the parser must handle them so a
		// downstream proxy that line-wraps doesn't break us.
		const record = 'event: failed\ndata: {"type":\ndata: "failed",\ndata: "reason":"x"}'
		const parsed = parseSseRecord(record)
		expect(parsed).toEqual({ type: 'failed', reason: 'x' })
	})
})

describe('formatSseDone', () => {
	it('emits a record that parseSseRecord recognizes as the sentinel', () => {
		const wire = formatSseDone()
		expect(wire.endsWith('\n\n')).toBe(true)
		expect(parseSseRecord(wire.trimEnd())).toBeNull()
	})
})

describe('consumeSseStream', () => {
	it('yields events from a single-chunk stream', async () => {
		const events: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'p1' },
			{ type: 'prompt_sent', promptHash: 'h', estimatedCents: 2 },
		]
		const wire = events.map(formatSseEvent).join('') + formatSseDone()
		const stream = streamFromChunks([wire])

		const got = await collectStream(consumeSseStream(stream))
		expect(got).toEqual(events)
	})

	it('reassembles records that arrive split across chunks', async () => {
		const events: OrchestratorEvent[] = [
			{
				type: 'file_written',
				path: 'src/app/page.tsx',
				contentHash: 'h',
				sizeBytes: 100,
				fileIndex: 0,
			},
			{ type: 'committed', buildId: 'b1', tokenCost: 100, actualCents: 1, fileCount: 1 },
		]
		const wire = events.map(formatSseEvent).join('') + formatSseDone()

		// Slice the wire into 11-byte chunks. None of the cuts will land on a
		// `\n\n` boundary, so the consumer must buffer correctly.
		const chunks: string[] = []
		for (let i = 0; i < wire.length; i += 11) chunks.push(wire.slice(i, i + 11))
		const stream = streamFromChunks(chunks)

		const got = await collectStream(consumeSseStream(stream))
		expect(got).toEqual(events)
	})

	it('stops at the [DONE] sentinel even if more bytes follow', async () => {
		const events: OrchestratorEvent[] = [{ type: 'started', buildId: 'b1', projectId: 'p1' }]
		const garbage = `event: file_written\ndata: ${JSON.stringify({
			type: 'file_written',
			path: 'never',
			contentHash: 'x',
			sizeBytes: 0,
			fileIndex: 99,
		})}\n\n`
		const wire = events.map(formatSseEvent).join('') + formatSseDone() + garbage
		const stream = streamFromChunks([wire])

		const got = await collectStream(consumeSseStream(stream))
		expect(got).toEqual(events)
		expect(got.find((e) => e.type === 'file_written')).toBeUndefined()
	})

	it('exits cleanly when the abort signal fires before the next read', async () => {
		const ctrl = new AbortController()
		// Hand-rolled never-ending stream so the consumer is stuck in `read()`
		// when we abort. We resolve the controller's first chunk, then the
		// generator will loop back to `read()` which we keep pending forever.
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				const wire = formatSseEvent({ type: 'started', buildId: 'b', projectId: 'p' })
				c.enqueue(new TextEncoder().encode(wire))
				// Don't close — leave the stream open. The next read() pulls.
			},
			pull() {
				// Hang forever. The abort path is what we're testing.
				return new Promise(() => {})
			},
		})

		const got: OrchestratorEvent[] = []
		const consumer = (async () => {
			for await (const ev of consumeSseStream(stream, ctrl.signal)) {
				got.push(ev)
				ctrl.abort()
			}
		})()

		await consumer
		expect(got).toEqual([{ type: 'started', buildId: 'b', projectId: 'p' }])
	})

	it('flushes a trailing record without the \\n\\n separator on stream end', async () => {
		// A misbehaving server (or a clean unbuffered EOF) might not emit the
		// final separator. We should still flush whatever is in the buffer.
		const event: OrchestratorEvent = { type: 'failed', reason: 'short', code: 'x' }
		const wire = `event: failed\ndata: ${JSON.stringify(event)}` // no trailing \n\n
		const stream = streamFromChunks([wire])

		const got = await collectStream(consumeSseStream(stream))
		expect(got).toEqual([event])
	})

	it('cancels the underlying source if the consumer breaks early', async () => {
		// Regression: if the caller stops iterating before EOF (e.g. they hit
		// a "failed" event and `return`), the underlying source must learn
		// about it so the network connection closes promptly.
		const cancelSpy = vi.fn()
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				// Enqueue one event then leave the stream open. The consumer
				// will yield it, the test will break out of the loop, and
				// the generator's finally block should call reader.cancel(),
				// which propagates to the source.
				const wire = formatSseEvent({ type: 'started', buildId: 'b', projectId: 'p' })
				c.enqueue(new TextEncoder().encode(wire))
			},
			pull() {
				// Hang the next read so the consumer is forced to cancel
				// rather than reading EOF.
				return new Promise(() => {})
			},
			cancel: cancelSpy,
		})

		for await (const _ of consumeSseStream(stream)) {
			break // bail after the first event
		}
		expect(cancelSpy).toHaveBeenCalledTimes(1)
	})
})
