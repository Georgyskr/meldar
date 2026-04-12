import { z } from 'zod'
import { extractTimePatterns } from './time-patterns'
import type { AiChatRawParseResult } from './types'

/**
 * Parse a Claude data export JSON.
 *
 * Claude exports are JSON with an array of conversations, each containing
 * `chat_messages` with sender/role and text/content fields. The export
 * format has historically used either `chat_messages` or `messages`, and
 * either `sender` or `role` — the Zod schema below admits both shapes.
 *
 * Validation strategy: a thin Zod boundary catches structurally garbage
 * input (root that's not an array/object, `conversations` that's not an
 * array, etc.) so the rest of the parser can trust its input. Earlier this
 * function was a chain of `as Record<string, unknown>` casts that silently
 * coerced strings/numbers/null into empty results — those are now hard
 * errors with a clear message.
 */

/**
 * One message inside a conversation. Every field is optional because the
 * historical export format has been remarkably loose — different exports
 * have used `text` vs `content`, `sender` vs `role`, ISO strings vs unix
 * timestamps for `created_at`. We accept the union and pick what's there
 * at extraction time.
 */
const claudeMessageSchema = z
	.object({
		sender: z.string().optional(),
		role: z.string().optional(),
		text: z.string().optional(),
		content: z.string().optional(),
		created_at: z.string().optional(),
	})
	// `passthrough` so unknown fields don't trip the parser if Anthropic
	// adds new ones — we only care about the user-message subset.
	.passthrough()

const claudeConversationSchema = z
	.object({
		chat_messages: z.array(claudeMessageSchema).optional(),
		messages: z.array(claudeMessageSchema).optional(),
	})
	.passthrough()

/**
 * Two accepted root shapes:
 *   1. Bare array of conversations: `[ {chat_messages: [...]}, ... ]`
 *   2. Object wrapping the array:    `{ conversations: [...] }`
 */
const claudeExportRootSchema = z.union([
	z.array(claudeConversationSchema),
	z.object({ conversations: z.array(claudeConversationSchema) }).passthrough(),
])

type ClaudeExportRoot = z.infer<typeof claudeExportRootSchema>

export async function parseClaudeExport(file: File): Promise<AiChatRawParseResult> {
	const text = await file.text()
	let raw: unknown
	try {
		raw = JSON.parse(text)
	} catch {
		throw new Error('File contains invalid JSON. Is this a valid Claude export?')
	}

	const validation = claudeExportRootSchema.safeParse(raw)
	if (!validation.success) {
		throw new Error(
			`Invalid Claude export shape: expected an array of conversations or an object with a 'conversations' array. ${validation.error.message}`,
		)
	}

	const root: ClaudeExportRoot = validation.data
	const conversations = Array.isArray(root) ? root : root.conversations

	const userMessages: { text: string; timestamp: number }[] = []

	for (const conv of conversations) {
		const messages = conv.chat_messages ?? conv.messages ?? []

		for (const msg of messages) {
			if (msg.sender === 'human' || msg.role === 'user') {
				const content = String(msg.text ?? msg.content ?? '').slice(0, 200)
				if (!content) continue

				const ts = msg.created_at ? new Date(msg.created_at).getTime() / 1000 : 0
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
