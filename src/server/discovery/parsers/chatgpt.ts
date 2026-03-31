import JSZip from 'jszip'
import { extractTimePatterns } from './time-patterns'
import type { AiChatParseResult } from './types'

/**
 * Parse a ChatGPT data export ZIP.
 *
 * The ZIP contains `conversations.json` — an array of conversation objects.
 * Each has a `mapping` field with a tree of message nodes.
 */
export async function parseChatGptExport(file: File): Promise<AiChatParseResult> {
	const archive = await JSZip.loadAsync(await file.arrayBuffer())

	const convFile = archive.file('conversations.json')
	if (!convFile) {
		throw new Error('No conversations.json found in ChatGPT export')
	}

	let raw: unknown
	try {
		raw = JSON.parse(await convFile.async('string'))
	} catch {
		throw new Error('conversations.json contains invalid JSON. Is this a valid ChatGPT export?')
	}
	if (!Array.isArray(raw)) {
		throw new Error('conversations.json is not an array')
	}

	const userMessages: { text: string; timestamp: number }[] = []

	for (const conv of raw) {
		if (!conv.mapping) continue
		for (const node of Object.values(conv.mapping) as Record<string, unknown>[]) {
			const msg = node?.message as Record<string, unknown> | undefined
			if (!msg) continue

			const author = msg.author as Record<string, unknown> | undefined
			const content = msg.content as Record<string, unknown> | undefined
			const parts = content?.parts as unknown[] | undefined

			if (author?.role === 'user' && parts?.[0]) {
				userMessages.push({
					text: String(parts[0]).slice(0, 200),
					timestamp: (msg.create_time as number) || 0,
				})
			}
		}
	}

	return {
		totalConversations: raw.length,
		topTopics: [], // filled by AI analysis step
		repeatedQuestions: [], // filled by AI analysis step
		timePatterns: extractTimePatterns(userMessages),
		platform: 'chatgpt',
		_rawMessages: userMessages.slice(0, 500),
	}
}
