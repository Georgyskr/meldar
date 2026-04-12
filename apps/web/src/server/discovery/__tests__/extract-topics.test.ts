import {
	type AnthropicCreateHandler,
	makeAnthropicMessage,
	makeTextBlock,
	makeToolUseBlock,
} from '@meldar/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockMessagesCreate } = vi.hoisted(() => ({
	mockMessagesCreate: vi.fn<AnthropicCreateHandler>(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create: mockMessagesCreate }
	},
}))

import { extractGoogleTopics, extractTopicsFromMessages } from '../extract-topics'

function makeMessages(count: number): { text: string; timestamp: number }[] {
	return Array.from({ length: count }, (_, i) => ({
		text: `Message ${i}`,
		timestamp: 1700000000 + i * 60,
	}))
}

function mockTopicToolResponse(input: Record<string, unknown>): void {
	mockMessagesCreate.mockResolvedValue(
		makeAnthropicMessage({ content: [makeToolUseBlock('extract_topics', input)] }),
	)
}

function mockGoogleTopicToolResponse(input: Record<string, unknown>): void {
	mockMessagesCreate.mockResolvedValue(
		makeAnthropicMessage({ content: [makeToolUseBlock('extract_google_topics', input)] }),
	)
}

describe('extractTopicsFromMessages', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns { topTopics: [], repeatedQuestions: [] } immediately when messages array is empty', async () => {
		const result = await extractTopicsFromMessages([], 'chatgpt')

		expect(result).toEqual({ topTopics: [], repeatedQuestions: [] })
		expect(mockMessagesCreate).not.toHaveBeenCalled()
	})

	it('truncates to first 300 messages when given more than 300', async () => {
		const messages = makeMessages(400)
		mockTopicToolResponse({
			topTopics: [],
			repeatedQuestions: [],
		})

		await extractTopicsFromMessages(messages, 'chatgpt')

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('300 user messages')
	})

	it('joins message texts with "---" separator in user content', async () => {
		const messages = [
			{ text: 'Hello', timestamp: 1700000000 },
			{ text: 'World', timestamp: 1700000060 },
		]
		mockTopicToolResponse({
			topTopics: [],
			repeatedQuestions: [],
		})

		await extractTopicsFromMessages(messages, 'chatgpt')

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('Hello\n---\nWorld')
	})

	it('includes platform name in system prompt', async () => {
		mockTopicToolResponse({
			topTopics: [],
			repeatedQuestions: [],
		})

		await extractTopicsFromMessages([{ text: 'test', timestamp: 0 }], 'claude')

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		expect(callArgs.system).toContain('claude')
	})

	it('returns parsed topTopics and repeatedQuestions on valid tool response', async () => {
		const validOutput = {
			topTopics: [
				{ topic: 'meal planning', count: 12, examples: ['weekly meals', 'grocery list'] },
			],
			repeatedQuestions: [
				{ pattern: 'How to plan meals for a week', frequency: 5, lastAsked: '2026-03-20' },
			],
		}
		mockTopicToolResponse(validOutput)

		const result = await extractTopicsFromMessages([{ text: 'test', timestamp: 0 }], 'chatgpt')

		expect(result.topTopics).toHaveLength(1)
		expect(result.topTopics[0].topic).toBe('meal planning')
		expect(result.repeatedQuestions).toHaveLength(1)
		expect(result.repeatedQuestions[0].pattern).toBe('How to plan meals for a week')
	})

	it('returns empty arrays when response.content has no tool_use block', async () => {
		mockMessagesCreate.mockResolvedValue(
			makeAnthropicMessage({ content: [makeTextBlock('I cannot extract topics')] }),
		)

		const result = await extractTopicsFromMessages([{ text: 'test', timestamp: 0 }], 'chatgpt')

		expect(result).toEqual({ topTopics: [], repeatedQuestions: [] })
	})

	it('returns empty arrays (graceful) when Zod validation fails on tool input', async () => {
		mockTopicToolResponse({
			topTopics: 'not an array',
			repeatedQuestions: 123,
		})

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const result = await extractTopicsFromMessages([{ text: 'test', timestamp: 0 }], 'chatgpt')

		expect(result).toEqual({ topTopics: [], repeatedQuestions: [] })
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Topic extraction output failed validation'),
		)
		warnSpy.mockRestore()
	})
})

describe('extractGoogleTopics', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns { searchTopics: [], youtubeTopCategories: [] } immediately when both inputs are empty', async () => {
		const result = await extractGoogleTopics([], [])

		expect(result).toEqual({ searchTopics: [], youtubeTopCategories: [] })
		expect(mockMessagesCreate).not.toHaveBeenCalled()
	})

	it('includes only the search section when youtubeWatches is empty', async () => {
		mockGoogleTopicToolResponse({
			searchTopics: [],
			youtubeTopCategories: [],
		})

		await extractGoogleTopics(['how to cook pasta'], [])

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('Google Searches')
		expect(userContent).not.toContain('YouTube Watches')
	})

	it('includes only the YouTube section when searches is empty', async () => {
		mockGoogleTopicToolResponse({
			searchTopics: [],
			youtubeTopCategories: [],
		})

		await extractGoogleTopics([], ['How to cook pasta tutorial'])

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).not.toContain('Google Searches')
		expect(userContent).toContain('YouTube Watches')
	})

	it('includes both sections when both are provided', async () => {
		mockGoogleTopicToolResponse({
			searchTopics: [],
			youtubeTopCategories: [],
		})

		await extractGoogleTopics(['how to cook'], ['cooking tutorial'])

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('Google Searches')
		expect(userContent).toContain('YouTube Watches')
	})

	it('truncates to 300 searches and 300 youtube watches independently', async () => {
		const searches = Array.from({ length: 400 }, (_, i) => `search ${i}`)
		const watches = Array.from({ length: 400 }, (_, i) => `video ${i}`)
		mockGoogleTopicToolResponse({
			searchTopics: [],
			youtubeTopCategories: [],
		})

		await extractGoogleTopics(searches, watches)

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('400 total, showing 300')
		// Both sections should mention 300
		const matches = userContent.match(/showing 300/g)
		expect(matches).toHaveLength(2)
	})

	it('returns { searchTopics, youtubeTopCategories } on valid tool response', async () => {
		const validOutput = {
			searchTopics: [{ topic: 'cooking', queryCount: 25, examples: ['recipe for pasta'] }],
			youtubeTopCategories: [{ category: 'Cooking', watchCount: 10, totalMinutes: 100 }],
		}
		mockGoogleTopicToolResponse(validOutput)

		const result = await extractGoogleTopics(['cooking recipe'], ['cooking video'])

		expect(result.searchTopics).toHaveLength(1)
		expect(result.searchTopics[0].topic).toBe('cooking')
		expect(result.youtubeTopCategories).toHaveLength(1)
		expect(result.youtubeTopCategories[0].category).toBe('Cooking')
	})

	it('returns empty arrays when response.content has no tool_use block', async () => {
		mockMessagesCreate.mockResolvedValue(
			makeAnthropicMessage({ content: [makeTextBlock('Cannot extract')] }),
		)

		const result = await extractGoogleTopics(['test'], ['test'])

		expect(result).toEqual({ searchTopics: [], youtubeTopCategories: [] })
	})

	it('returns empty arrays when Zod validation fails on tool input', async () => {
		mockGoogleTopicToolResponse({
			searchTopics: 'invalid',
			youtubeTopCategories: 999,
		})

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const result = await extractGoogleTopics(['test'], ['test'])

		expect(result).toEqual({ searchTopics: [], youtubeTopCategories: [] })
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Google topic extraction output failed validation'),
		)
		warnSpy.mockRestore()
	})
})
