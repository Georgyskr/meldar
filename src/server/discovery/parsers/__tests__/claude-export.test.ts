import { describe, expect, it } from 'vitest'
import { parseClaudeExport } from '../claude-export'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(content: string, name = 'claude-export.json'): File {
	return new File([content], name, { type: 'application/json' })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('parseClaudeExport', () => {
	describe('array format', () => {
		it('parses conversations where messages are in chat_messages field', async () => {
			const data = [
				{
					chat_messages: [
						{ sender: 'human', text: 'Hello from user', created_at: '2026-03-20T10:00:00Z' },
						{ sender: 'assistant', text: 'Hi there!', created_at: '2026-03-20T10:00:01Z' },
					],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result.totalConversations).toBe(1)
			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Hello from user')
		})

		it('parses when messages are in .messages instead of .chat_messages', async () => {
			const data = [
				{
					messages: [
						{ role: 'user', content: 'Hello from user', created_at: '2026-03-20T10:00:00Z' },
						{
							role: 'assistant',
							content: 'Hi there!',
							created_at: '2026-03-20T10:00:01Z',
						},
					],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Hello from user')
		})

		it('accepts sender === "human" as user messages', async () => {
			const data = [
				{
					chat_messages: [
						{ sender: 'human', text: 'Human message' },
						{ sender: 'assistant', text: 'Bot reply' },
					],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Human message')
		})

		it('accepts role === "user" as user messages', async () => {
			const data = [
				{
					messages: [
						{ role: 'user', content: 'User message' },
						{ role: 'assistant', content: 'Bot reply' },
					],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('User message')
		})

		it('skips messages with no text or content without throwing', async () => {
			const data = [
				{
					chat_messages: [
						{ sender: 'human', text: '' },
						{ sender: 'human', text: 'Valid message' },
						{ sender: 'human' }, // no text or content at all
					],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages).toHaveLength(1)
			expect(result._rawMessages[0].text).toBe('Valid message')
		})

		it('truncates message text to 200 chars', async () => {
			const longText = 'B'.repeat(300)
			const data = [
				{
					chat_messages: [{ sender: 'human', text: longText }],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages[0].text).toHaveLength(200)
		})

		it('converts created_at ISO string to Unix timestamp (divided by 1000)', async () => {
			const isoDate = '2026-03-20T10:00:00Z'
			const expectedTimestamp = new Date(isoDate).getTime() / 1000
			const data = [
				{
					chat_messages: [{ sender: 'human', text: 'Hello', created_at: isoDate }],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages[0].timestamp).toBe(expectedTimestamp)
		})

		it('caps _rawMessages at 500 entries', async () => {
			const messages = Array.from({ length: 600 }, (_, i) => ({
				sender: 'human',
				text: `Message ${i}`,
			}))
			const data = [{ chat_messages: messages }]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result._rawMessages).toHaveLength(500)
		})

		it('returns platform: "claude"', async () => {
			const data = [
				{
					chat_messages: [{ sender: 'human', text: 'Hello' }],
				},
			]
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result.platform).toBe('claude')
		})
	})

	describe('object format with .conversations key', () => {
		it('extracts conversations from root.conversations array when root is an object', async () => {
			const data = {
				conversations: [
					{
						chat_messages: [
							{ sender: 'human', text: 'From object format' },
							{ sender: 'assistant', text: 'Reply' },
						],
					},
					{
						chat_messages: [{ sender: 'human', text: 'Second conversation' }],
					},
				],
			}
			const file = makeFile(JSON.stringify(data))

			const result = await parseClaudeExport(file)

			expect(result.totalConversations).toBe(2)
			expect(result._rawMessages).toHaveLength(2)
			expect(result._rawMessages[0].text).toBe('From object format')
			expect(result._rawMessages[1].text).toBe('Second conversation')
		})
	})

	describe('error cases — these are THROWS', () => {
		it('throws Error containing "invalid JSON" for non-JSON file content', async () => {
			const file = makeFile('this is not json at all {{{')

			await expect(parseClaudeExport(file)).rejects.toThrow('invalid JSON')
		})
	})
})
