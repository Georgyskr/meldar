import type { Page } from '@playwright/test'

export type SseEvent = {
	type: string
	payload: unknown
	receivedAt: number
}

export type SseCaptureHandle = {
	events: () => Promise<SseEvent[]>
	buildId: () => Promise<string | null>
	asJsonl: () => Promise<string>
}

declare global {
	interface Window {
		__meldarSseCapture?: {
			patterns: string[]
			events: Array<{ type: string; payload: unknown; receivedAt: number }>
			installed: boolean
		}
	}
}

export async function installSseCapture(
	page: Page,
	urlPatterns: RegExp | RegExp[],
): Promise<SseCaptureHandle> {
	const patterns = (Array.isArray(urlPatterns) ? urlPatterns : [urlPatterns]).map((p) => p.source)

	await page.addInitScript((patternSources: string[]) => {
		if (window.__meldarSseCapture?.installed) {
			window.__meldarSseCapture.patterns = patternSources
			return
		}

		const state = {
			patterns: patternSources,
			events: [] as Array<{ type: string; payload: unknown; receivedAt: number }>,
			installed: true,
		}
		window.__meldarSseCapture = state

		const matches = (url: string): boolean =>
			state.patterns.some((src) => new RegExp(src).test(url))

		const parseRecord = (record: string): { type: string; payload: unknown } | null => {
			let eventName = 'message'
			const dataLines: string[] = []
			for (const rawLine of record.split('\n')) {
				const line = rawLine.replace(/\r$/, '')
				if (line === '' || line.startsWith(':')) continue
				const colonIdx = line.indexOf(':')
				if (colonIdx === -1) continue
				const field = line.slice(0, colonIdx)
				let value = line.slice(colonIdx + 1)
				if (value.startsWith(' ')) value = value.slice(1)
				if (field === 'event') eventName = value
				else if (field === 'data') dataLines.push(value)
			}
			if (dataLines.length === 0) return null
			const dataPayload = dataLines.join('\n')
			if (dataPayload === '[DONE]') return { type: 'done', payload: '[DONE]' }
			try {
				const parsed = JSON.parse(dataPayload)
				const type =
					parsed && typeof parsed === 'object' && typeof parsed.type === 'string'
						? parsed.type
						: eventName
				return { type, payload: parsed }
			} catch {
				return { type: eventName, payload: dataPayload }
			}
		}

		const drainBuffer = (buffer: string): { processed: number } => {
			let processed = 0
			let separatorIdx = buffer.indexOf('\n\n', processed)
			while (separatorIdx !== -1) {
				const record = buffer.slice(processed, separatorIdx)
				processed = separatorIdx + 2
				if (record.length > 0) {
					const parsed = parseRecord(record)
					if (parsed) {
						state.events.push({
							type: parsed.type,
							payload: parsed.payload,
							receivedAt: Date.now(),
						})
					}
				}
				separatorIdx = buffer.indexOf('\n\n', processed)
			}
			return { processed }
		}

		const originalFetch = window.fetch.bind(window)
		window.fetch = async (...args) => {
			const response = await originalFetch(...args)
			const url =
				typeof args[0] === 'string'
					? args[0]
					: args[0] instanceof URL
						? args[0].toString()
						: args[0] instanceof Request
							? args[0].url
							: ''

			if (!matches(url) || !response.body) return response

			const [forClient, forCapture] = response.body.tee()

			void (async () => {
				const reader = forCapture.getReader()
				const decoder = new TextDecoder('utf-8')
				let buffer = ''
				try {
					while (true) {
						const { done, value } = await reader.read()
						if (done) break
						buffer += decoder.decode(value, { stream: true })
						const { processed } = drainBuffer(buffer)
						if (processed > 0) buffer = buffer.slice(processed)
					}
					if (buffer.trim().length > 0) {
						const parsed = parseRecord(buffer)
						if (parsed) {
							state.events.push({
								type: parsed.type,
								payload: parsed.payload,
								receivedAt: Date.now(),
							})
						}
					}
				} catch {
					// capture-side failures must never affect the page
				} finally {
					try {
						reader.releaseLock()
					} catch {
						// already released
					}
				}
			})()

			return new Response(forClient, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			})
		}
	}, patterns)

	const readEvents = async (): Promise<SseEvent[]> => {
		const result = await page.evaluate(() => window.__meldarSseCapture?.events ?? [])
		return result as SseEvent[]
	}

	return {
		events: readEvents,
		buildId: async () => {
			const events = await readEvents()
			for (const event of events) {
				const payload = event.payload as { buildId?: unknown } | null | undefined
				if (payload && typeof payload === 'object' && typeof payload.buildId === 'string') {
					return payload.buildId
				}
			}
			return null
		},
		asJsonl: async () => {
			const events = await readEvents()
			return events.map((e) => JSON.stringify(e)).join('\n')
		},
	}
}
