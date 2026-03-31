import type Anthropic from '@anthropic-ai/sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockMessagesCreate } = vi.hoisted(() => ({
	mockMessagesCreate: vi.fn<Parameters<Anthropic['messages']['create']>>(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create: mockMessagesCreate }
	},
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { extractScreenTime } from '../ocr'

// ── Fixtures ────────────────────────────────────────────────────────────────

const validScreenTimeToolInput = {
	apps: [{ name: 'Instagram', usageMinutes: 90, category: 'social' as const }],
	totalScreenTimeMinutes: 360,
	platform: 'ios' as const,
	confidence: 'high' as const,
	pickups: 42,
	firstAppOpenTime: '07:30',
	date: '2026-03-31',
}

function mockToolUseResponse(input: Record<string, unknown>) {
	mockMessagesCreate.mockResolvedValue({
		content: [
			{
				type: 'tool_use' as const,
				id: 'toolu_01',
				name: 'extract_screen_time',
				input,
			},
		],
	})
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('extractScreenTime', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('successful extraction', () => {
		it('returns { data } matching screenTimeExtractionSchema for valid tool output', async () => {
			mockToolUseResponse(validScreenTimeToolInput)

			const result = await extractScreenTime('base64data', 'image/png')

			expect(result).toEqual({ data: validScreenTimeToolInput })
		})

		it('passes focusMode=true by appending FOCUS_MODE_PROMPT_ADDENDUM after a newline in system prompt', async () => {
			mockToolUseResponse(validScreenTimeToolInput)

			await extractScreenTime('base64data', 'image/jpeg', { focusMode: true })

			const callArgs = mockMessagesCreate.mock.calls[0][0]
			expect(callArgs.system).toContain('FOCUS MODE CONTEXT')
		})

		it('passes focusMode=false (default) with base SCREEN_TIME_SYSTEM_PROMPT only', async () => {
			mockToolUseResponse(validScreenTimeToolInput)

			await extractScreenTime('base64data', 'image/png')

			const callArgs = mockMessagesCreate.mock.calls[0][0]
			expect(callArgs.system).not.toContain('FOCUS MODE CONTEXT')
		})

		it('sets tool_choice to { type: "tool", name: "extract_screen_time" }', async () => {
			mockToolUseResponse(validScreenTimeToolInput)

			await extractScreenTime('base64data', 'image/webp')

			const callArgs = mockMessagesCreate.mock.calls[0][0]
			expect(callArgs.tool_choice).toEqual({
				type: 'tool',
				name: 'extract_screen_time',
			})
		})
	})

	describe('error responses from AI', () => {
		it('returns { error: "not_screen_time" } when tool input.error is "not_screen_time"', async () => {
			mockToolUseResponse({
				apps: [],
				totalScreenTimeMinutes: 0,
				platform: 'unknown',
				confidence: 'low',
				error: 'not_screen_time',
			})

			const result = await extractScreenTime('base64data', 'image/png')

			expect(result).toEqual({ error: 'not_screen_time' })
		})

		it('returns { error: "unreadable" } when tool input.error is "unreadable"', async () => {
			mockToolUseResponse({
				apps: [],
				totalScreenTimeMinutes: 0,
				platform: 'unknown',
				confidence: 'low',
				error: 'unreadable',
			})

			const result = await extractScreenTime('base64data', 'image/png')

			expect(result).toEqual({ error: 'unreadable' })
		})
	})

	describe('broken AI responses', () => {
		it('throws Error("No tool use in response") when response.content has no tool_use block', async () => {
			mockMessagesCreate.mockResolvedValue({
				content: [{ type: 'text' as const, text: 'I cannot process this image' }],
			})

			await expect(extractScreenTime('base64data', 'image/png')).rejects.toThrow(
				'No tool use in response',
			)
		})

		it('throws with Zod error message when tool input fails screenTimeExtractionSchema', async () => {
			mockToolUseResponse({
				apps: 'not an array',
				totalScreenTimeMinutes: 'not a number',
				platform: 'invalid_platform',
				confidence: 'invalid',
			})

			await expect(extractScreenTime('base64data', 'image/png')).rejects.toThrow(
				'Invalid extraction',
			)
		})
	})
})
