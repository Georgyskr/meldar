import { extractTimePatterns } from './time-patterns'
import type { AiChatRawParseResult } from './types'

/**
 * Parse a Claude data export JSON.
 *
 * Claude exports are JSON with an array of conversations, each containing
 * `chat_messages` with sender/role and text/content fields.
 */
export async function parseClaudeExport(file: File): Promise<AiChatRawParseResult> {
	const text = await file.text()
	let raw: unknown
	try {
		raw = JSON.parse(text)
	} catch {
		throw new Error('File contains invalid JSON. Is this a valid Claude export?')
	}

	const userMessages: { text: string; timestamp: number }[] = []

	// Claude export: array of conversations or object with .conversations
	const conversations = Array.isArray(raw)
		? raw
		: (((raw as Record<string, unknown>)?.conversations as unknown[]) ?? [])

	for (const conv of conversations) {
		const c = conv as Record<string, unknown>
		const messages = (c.chat_messages ?? c.messages ?? []) as Record<string, unknown>[]

		for (const msg of messages) {
			if (msg.sender === 'human' || msg.role === 'user') {
				const content = String(msg.text ?? msg.content ?? '').slice(0, 200)
				if (!content) continue

				const ts = msg.created_at ? new Date(msg.created_at as string).getTime() / 1000 : 0
				userMessages.push({ text: content, timestamp: ts })
			}
		}
	}

	return {
		totalConversations: conversations.length,
		topTopics: [],
		repeatedQuestions: [],
		timePatterns: extractTimePatterns(userMessages),
		platform: 'claude',
		_rawMessages: userMessages.slice(0, 500),
	}
}
