import type Anthropic from '@anthropic-ai/sdk'
import { type MockedFunction, vi } from 'vitest'

export type AnthropicMessagesCreate = Anthropic['messages']['create']

export type AnthropicCreateHandler = (
	body: Parameters<AnthropicMessagesCreate>[0],
	options?: Parameters<AnthropicMessagesCreate>[1],
) => Promise<Anthropic.Messages.Message>

export type AnthropicMockResult = {
	client: Anthropic
	mock: MockedFunction<AnthropicCreateHandler>
}

export function makeAnthropicMock(handler: AnthropicCreateHandler): AnthropicMockResult {
	const mock = vi.fn(handler)
	const client = { messages: { create: mock } } as unknown as Anthropic
	return { client, mock }
}

const DEFAULT_USAGE: Anthropic.Messages.Usage = {
	input_tokens: 0,
	output_tokens: 0,
	cache_creation: null,
	cache_creation_input_tokens: null,
	cache_read_input_tokens: null,
	inference_geo: null,
	server_tool_use: null,
	service_tier: null,
}

type MessageOverrides = Partial<Anthropic.Messages.Message> & {
	content: Anthropic.Messages.ContentBlock[]
}

// Fills in every required SDK field so tests can spread `{ content: [...] }` and get a valid Message.
export function makeAnthropicMessage(overrides: MessageOverrides): Anthropic.Messages.Message {
	return {
		id: 'msg_test',
		type: 'message',
		role: 'assistant',
		model: 'claude-sonnet-4-6',
		stop_reason: 'end_turn',
		stop_sequence: null,
		container: null,
		usage: DEFAULT_USAGE,
		...overrides,
	}
}

export function makeToolUseBlock(
	name: string,
	input: Record<string, unknown>,
	id = 'toolu_test',
): Anthropic.Messages.ToolUseBlock {
	return { type: 'tool_use', id, name, input, caller: { type: 'direct' } }
}

export function makeTextBlock(text: string): Anthropic.Messages.TextBlock {
	return { type: 'text', text, citations: null }
}
