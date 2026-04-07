import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import { parseChatGptExport } from '../chatgpt'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeConversation(
	userMessages: { text: string; createTime?: number }[],
): Record<string, unknown> {
	const mapping: Record<string, unknown> = {}
	for (let i = 0; i < userMessages.length; i++) {
		mapping[`node_${i}`] = {
			message: {
				author: { role: 'user' },
				content: { parts: [userMessages[i].text] },
				create_time: userMessages[i].createTime ?? 0,
			},
		}
	}
	return { mapping }
}

function makeAssistantConversation(): Record<string, unknown> {
	return {
		mapping: {
			node_0: {
				message: {
					author: { role: 'assistant' },
					content: { parts: ['I can help with that'] },
					create_time: 1700000000,
				},
			},
		},
	}
}

async function makeZipFile(
	conversationsJson: string,
	filename = 'conversations.json',
): Promise<File> {
	const zip = new JSZip()
	zip.file(filename, conversationsJson)
	const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
	return new File([blob], 'export.zip', { type: 'application/zip' })
}

async function makeEmptyZip(): Promise<File> {
	const zip = new JSZip()
	zip.file('readme.txt', 'No conversations here')
	const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
	return new File([blob], 'export.zip', { type: 'application/zip' })
}

async function makeBombFile(): Promise<File> {
	// Build a normal ZIP, then create a File from it.
	// The parser calls JSZip.loadAsync on the file bytes, then inspects _data.uncompressedSize.
	// We use a spy to intercept loadAsync and inflate the reported size.
	const zip = new JSZip()
	zip.file('conversations.json', '[]')
	const buf = await zip.generateAsync({ type: 'arraybuffer' })
	const file = new File([buf], 'export.zip', { type: 'application/zip' })

	// Spy on JSZip.loadAsync to mutate _data on the loaded archive
	const origLoadAsync = JSZip.loadAsync.bind(JSZip)
	vi.spyOn(JSZip, 'loadAsync').mockImplementationOnce(async (data) => {
		const archive = await origLoadAsync(data)
		for (const entry of Object.values(archive.files)) {
			;(entry as unknown as { _data: { uncompressedSize: number } })._data = {
				uncompressedSize: 600 * 1024 * 1024,
			}
		}
		return archive
	})

	return file
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('parseChatGptExport', () => {
	describe('valid export', () => {
		it('counts total conversations correctly', async () => {
			const conversations = [
				makeConversation([{ text: 'Hello' }]),
				makeConversation([{ text: 'World' }]),
				makeConversation([{ text: 'Test' }]),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.totalConversations).toBe(3)
		})

		it('extracts user messages by traversing the mapping tree', async () => {
			const conversations = [
				makeConversation([
					{ text: 'First message', createTime: 1700000000 },
					{ text: 'Second message', createTime: 1700000060 },
				]),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result._rawMessages).toHaveLength(2)
			expect(result._rawMessages[0].text).toBe('First message')
			expect(result._rawMessages[1].text).toBe('Second message')
		})

		it('truncates individual message text to 200 chars', async () => {
			const longText = 'A'.repeat(300)
			const conversations = [makeConversation([{ text: longText }])]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result._rawMessages[0].text).toHaveLength(200)
		})

		it('caps _rawMessages at 500 entries', async () => {
			const messages = Array.from({ length: 600 }, (_, i) => ({
				text: `Message ${i}`,
				createTime: 1700000000 + i,
			}))
			const conversations = [makeConversation(messages)]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result._rawMessages).toHaveLength(500)
		})

		it('returns platform: "chatgpt"', async () => {
			const conversations = [makeConversation([{ text: 'Hello' }])]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.platform).toBe('chatgpt')
		})

		it('returns empty topTopics and repeatedQuestions (these are filled in the AI step)', async () => {
			const conversations = [makeConversation([{ text: 'Hello' }])]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.topTopics).toEqual([])
			expect(result.repeatedQuestions).toEqual([])
		})

		it('computes timePatterns via extractTimePatterns', async () => {
			// Use weekday timestamps (Wednesday)
			const conversations = [
				makeConversation([
					{ text: 'Hello', createTime: 1700000000 }, // Tue Nov 14 2023
					{ text: 'World', createTime: 1700003600 },
				]),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.timePatterns).toHaveProperty('mostActiveHour')
			expect(result.timePatterns).toHaveProperty('weekdayVsWeekend')
		})
	})

	describe('zip bomb protection', () => {
		it('throws "Archive too large when decompressed" when total uncompressed size > 500 MB', async () => {
			const file = await makeBombFile()

			await expect(parseChatGptExport(file)).rejects.toThrow('Archive too large when decompressed')
		})

		it('throws before any file content is extracted', async () => {
			const file = await makeBombFile()

			await expect(parseChatGptExport(file)).rejects.toThrow('Archive too large when decompressed')
			// If it got past the bomb check, it would try to read conversations.json
			// and throw a different error — the "Archive too large" error confirms early exit
		})
	})

	describe('error cases — these are THROWS, not return values', () => {
		it('throws Error("No conversations.json found in ChatGPT export") when file is absent in ZIP', async () => {
			const file = await makeEmptyZip()

			await expect(parseChatGptExport(file)).rejects.toThrow(
				'No conversations.json found in ChatGPT export',
			)
		})

		it('throws Error containing "invalid JSON" when conversations.json is malformed', async () => {
			const file = await makeZipFile('this is not json {{{')

			await expect(parseChatGptExport(file)).rejects.toThrow('invalid JSON')
		})

		it('throws Error containing "Invalid ChatGPT conversations.json shape" when root is an object, not array', async () => {
			const file = await makeZipFile(JSON.stringify({ conversations: [] }))

			await expect(parseChatGptExport(file)).rejects.toThrow(
				/Invalid ChatGPT conversations\.json shape/i,
			)
		})

		it('throws when a conversation entry is not an object (null in array)', async () => {
			const file = await makeZipFile(JSON.stringify([null]))
			await expect(parseChatGptExport(file)).rejects.toThrow(
				/Invalid ChatGPT conversations\.json shape/i,
			)
		})

		it('throws when a conversation entry is a primitive (string in array)', async () => {
			const file = await makeZipFile(JSON.stringify(['oops']))
			await expect(parseChatGptExport(file)).rejects.toThrow(
				/Invalid ChatGPT conversations\.json shape/i,
			)
		})

		it('throws when conversation.mapping is not an object', async () => {
			const file = await makeZipFile(JSON.stringify([{ mapping: 'not an object' }]))
			await expect(parseChatGptExport(file)).rejects.toThrow(
				/Invalid ChatGPT conversations\.json shape/i,
			)
		})

		it('skips conversation nodes with no mapping field without throwing', async () => {
			const conversations = [
				{ title: 'No mapping' }, // no mapping field
				makeConversation([{ text: 'Valid message' }]),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.totalConversations).toBe(2)
			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Valid message')
		})

		it('tolerates mapping: null (soft-deleted conversations)', async () => {
			const conversations = [
				{ title: 'Soft-deleted', mapping: null },
				makeConversation([{ text: 'Valid message' }]),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result.totalConversations).toBe(2)
			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Valid message')
		})

		it('skips message nodes where author.role is not "user" without throwing', async () => {
			const conversations = [
				makeConversation([{ text: 'User message' }]),
				makeAssistantConversation(),
			]
			const file = await makeZipFile(JSON.stringify(conversations))

			const result = await parseChatGptExport(file)

			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('User message')
		})
	})
})
