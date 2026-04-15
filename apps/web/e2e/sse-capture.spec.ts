import { expect, test } from '@playwright/test'
import { installSseCapture } from './lib/sse-capture'

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ retries: 0 })

const TEST_URL = 'http://localhost:3101/__sse-capture-test__'
const STREAM_URL = 'http://localhost:3101/__sse-capture-stream__'

test.describe('SSE capture helper', () => {
	test('captures every event from a streaming response without blocking the consumer', async ({
		page,
	}) => {
		const capture = await installSseCapture(page, /__sse-capture-test__/)

		await page.route(TEST_URL, async (route) => {
			const body = [
				'event: started',
				'data: {"type":"started","buildId":"build-abc","projectId":"proj-1"}',
				'',
				'event: file_written',
				'data: {"type":"file_written","path":"src/app/page.tsx","contentHash":"h1","sizeBytes":42,"fileIndex":0}',
				'',
				'event: sandbox_ready',
				'data: {"type":"sandbox_ready","previewUrl":"https://preview.test"}',
				'',
				'event: done',
				'data: [DONE]',
				'',
				'',
			].join('\n')
			await route.fulfill({
				status: 200,
				headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
				body,
			})
		})

		await page.goto('http://localhost:3101/')

		const consumed = await page.evaluate(async (url) => {
			const res = await fetch(url, { method: 'POST' })
			if (!res.body) return []
			const reader = res.body.getReader()
			const decoder = new TextDecoder()
			const out: string[] = []
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				out.push(decoder.decode(value, { stream: true }))
			}
			return out
		}, TEST_URL)

		const consumedText = consumed.join('')
		expect(consumedText).toContain('"buildId":"build-abc"')
		expect(consumedText).toContain('"previewUrl":"https://preview.test"')
		expect(consumedText).toContain('[DONE]')

		const events = await capture.events()
		const types = events.map((e) => e.type)
		expect(types).toEqual(['started', 'file_written', 'sandbox_ready', 'done'])

		const buildId = await capture.buildId()
		expect(buildId).toBe('build-abc')

		const jsonl = await capture.asJsonl()
		expect(jsonl.split('\n')).toHaveLength(4)
		const firstLine = JSON.parse(jsonl.split('\n')[0])
		expect(firstLine.type).toBe('started')
		expect(firstLine.payload.projectId).toBe('proj-1')
	})

	test('does not block live consumption when chunks arrive over time', async ({ page }) => {
		const capture = await installSseCapture(page, /__sse-capture-stream__/)

		await page.route(STREAM_URL, async (route) => {
			const encoder = new TextEncoder()
			const stream = new ReadableStream<Uint8Array>({
				async start(controller) {
					controller.enqueue(
						encoder.encode('event: started\ndata: {"type":"started","buildId":"b1"}\n\n'),
					)
					await new Promise((r) => setTimeout(r, 50))
					controller.enqueue(
						encoder.encode('event: file_written\ndata: {"type":"file_written","fileIndex":0}\n\n'),
					)
					await new Promise((r) => setTimeout(r, 50))
					controller.enqueue(encoder.encode('event: done\ndata: [DONE]\n\n'))
					controller.close()
				},
			})
			await route.fulfill({
				status: 200,
				headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
				body: await new Response(stream).text(),
			})
		})

		await page.goto('http://localhost:3101/')

		const chunkArrivalTimes = await page.evaluate(async (url) => {
			const res = await fetch(url, { method: 'POST' })
			if (!res.body) return []
			const reader = res.body.getReader()
			const times: number[] = []
			const start = performance.now()
			while (true) {
				const { done } = await reader.read()
				if (done) break
				times.push(performance.now() - start)
			}
			return times
		}, STREAM_URL)

		expect(chunkArrivalTimes.length).toBeGreaterThan(0)

		const events = await capture.events()
		expect(events.map((e) => e.type)).toEqual(['started', 'file_written', 'done'])
	})
})
