import JSZip from 'jszip'
import { z } from 'zod'
import { extractTimePatterns } from './time-patterns'
import type { AiChatRawParseResult } from './types'

const MAX_DECOMPRESSED_SIZE = 500 * 1024 * 1024 // 500 MB

const chatGptMessageNodeSchema = z
	.object({
		message: z
			.object({
				author: z.object({ role: z.string().optional() }).passthrough().optional(),
				content: z
					.object({ parts: z.array(z.unknown()).optional() })
					.passthrough()
					.optional(),
				create_time: z.number().nullable().optional(),
			})
			.passthrough()
			.nullable()
			.optional(),
	})
	.passthrough()

const chatGptConversationSchema = z
	.object({
		// Nullable because real exports ship soft-deleted conversations as `mapping: null`.
		mapping: z.record(z.string(), chatGptMessageNodeSchema).nullable().optional(),
	})
	.passthrough()

const chatGptConversationsRootSchema = z.array(chatGptConversationSchema)

export async function parseChatGptExport(file: File): Promise<AiChatRawParseResult> {
	const archive = await JSZip.loadAsync(await file.arrayBuffer())

	// JSZip exposes uncompressed sizes only via internal `_data` — no public API.
	let totalSize = 0
	for (const entry of Object.values(archive.files)) {
		totalSize +=
			(entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
	}
	if (totalSize > MAX_DECOMPRESSED_SIZE) {
		throw new Error(
			'Archive too large when decompressed. Please select fewer data categories in your export.',
		)
	}

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

	const validation = chatGptConversationsRootSchema.safeParse(raw)
	if (!validation.success) {
		throw new Error(
			`Invalid ChatGPT conversations.json shape: expected an array of conversation objects with optional mapping trees. ${validation.error.message}`,
		)
	}
	const conversations = validation.data

	const userMessages: { text: string; timestamp: number }[] = []

	for (const conv of conversations) {
		if (!conv.mapping) continue
		for (const node of Object.values(conv.mapping)) {
			const msg = node.message
			if (!msg) continue

			const role = msg.author?.role
			const firstPart = msg.content?.parts?.[0]

			if (role === 'user' && firstPart != null) {
				userMessages.push({
					text: String(firstPart).slice(0, 200),
					timestamp: msg.create_time ?? 0,
				})
			}
		}
	}

	return {
		totalConversations: conversations.length,
		topTopics: [],
		repeatedQuestions: [],
		timePatterns: extractTimePatterns(userMessages),
		platform: 'chatgpt',
		_rawMessages: userMessages.slice(0, 500),
	}
}
