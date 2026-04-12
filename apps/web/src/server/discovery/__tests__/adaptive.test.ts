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

import { generateAdaptiveFollowUps } from '../adaptive'


const validInput = {
	screenTimeApps: [
		{ name: 'Instagram', usageMinutes: 90, category: 'social' },
		{ name: 'Notion', usageMinutes: 45, category: 'productivity' },
		{ name: 'Spotify', usageMinutes: 30, category: 'entertainment' },
	],
	occupation: 'Student',
	ageBracket: '18-24',
}

const validFollowUps = {
	followUps: [
		{
			type: 'screenshot' as const,
			appName: 'Notion',
			title: 'Screenshot your Notion sidebar',
			description: 'Shows how you organize knowledge and active projects',
			accept: 'image/jpeg,image/png,image/webp',
		},
		{
			type: 'question' as const,
			title: 'How do you use Instagram?',
			description: 'Helps us understand if you create or consume content',
			options: ['I mostly scroll and watch', 'I post regularly', 'Both equally'],
		},
	],
}

function mockFollowUpToolResponse(input: Record<string, unknown>): void {
	mockMessagesCreate.mockResolvedValue(
		makeAnthropicMessage({ content: [makeToolUseBlock('generate_follow_ups', input)] }),
	)
}


describe('generateAdaptiveFollowUps', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('calls Haiku with APP_TO_SCREENSHOT_MAP embedded in system prompt', async () => {
		mockFollowUpToolResponse(validFollowUps)

		await generateAdaptiveFollowUps(validInput)

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
		// Verify the system prompt contains at least some app categories from the map
		expect(callArgs.system).toContain('trading')
		expect(callArgs.system).toContain('Robinhood')
		expect(callArgs.system).toContain('notes')
		expect(callArgs.system).toContain('Notion')
	})

	it('includes occupation and ageBracket in user message content', async () => {
		mockFollowUpToolResponse(validFollowUps)

		await generateAdaptiveFollowUps(validInput)

		const callArgs = mockMessagesCreate.mock.calls[0][0]
		const userContent = callArgs.messages[0].content as string
		expect(userContent).toContain('Occupation: Student')
		expect(userContent).toContain('Age bracket: 18-24')
	})

	it('returns [] when response.content has no tool_use block (graceful fallback)', async () => {
		mockMessagesCreate.mockResolvedValue(
			makeAnthropicMessage({ content: [makeTextBlock('I cannot generate follow-ups')] }),
		)

		const result = await generateAdaptiveFollowUps(validInput)

		expect(result).toEqual([])
	})

	it('returns [] and logs console.warn when Zod validation fails on tool input', async () => {
		mockFollowUpToolResponse({
			followUps: 'not an array',
		})

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const result = await generateAdaptiveFollowUps(validInput)

		expect(result).toEqual([])
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Adaptive follow-up output failed validation'),
		)
		warnSpy.mockRestore()
	})

	it('caps result at 5 follow-ups even if AI returns more than 5', async () => {
		const manyFollowUps = {
			followUps: Array.from({ length: 8 }, (_, i) => ({
				type: 'question' as const,
				title: `Follow-up ${i}`,
				description: `Description ${i}`,
			})),
		}
		mockFollowUpToolResponse(manyFollowUps)

		const result = await generateAdaptiveFollowUps(validInput)

		expect(result).toHaveLength(5)
	})

	it('returns valid AdaptiveFollowUp[] with required fields: type, title, description', async () => {
		mockFollowUpToolResponse(validFollowUps)

		const result = await generateAdaptiveFollowUps(validInput)

		expect(result).toHaveLength(2)
		for (const item of result) {
			expect(item).toHaveProperty('type')
			expect(item).toHaveProperty('title')
			expect(item).toHaveProperty('description')
		}
	})

	it('returns accept field set on screenshot-type items', async () => {
		mockFollowUpToolResponse(validFollowUps)

		const result = await generateAdaptiveFollowUps(validInput)

		const screenshot = result.find((r) => r.type === 'screenshot')
		expect(screenshot).toBeDefined()
		expect(screenshot?.accept).toBe('image/jpeg,image/png,image/webp')
	})

	it('returns options array on question-type items', async () => {
		mockFollowUpToolResponse(validFollowUps)

		const result = await generateAdaptiveFollowUps(validInput)

		const question = result.find((r) => r.type === 'question')
		expect(question).toBeDefined()
		expect(question?.options).toEqual([
			'I mostly scroll and watch',
			'I post regularly',
			'Both equally',
		])
	})
})
