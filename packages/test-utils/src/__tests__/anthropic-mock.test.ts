import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	makeAnthropicMessage,
	makeAnthropicMock,
	makeTextBlock,
	makeToolUseBlock,
} from '../anthropic-mock'

describe('makeAnthropicMock', () => {
	it('exposes a callable client.messages.create that delegates to the handler', async () => {
		const { client, mock } = makeAnthropicMock(async () => ({
			id: 'msg_test',
			type: 'message',
			role: 'assistant',
			model: 'claude-sonnet-4-6',
			stop_reason: 'end_turn',
			stop_sequence: null,
			container: null,
			content: [],
			usage: {
				input_tokens: 1,
				output_tokens: 1,
				cache_creation: null,
				cache_creation_input_tokens: null,
				cache_read_input_tokens: null,
				inference_geo: null,
				server_tool_use: null,
				service_tier: null,
			},
		}))

		const result = (await client.messages.create({
			model: 'claude-sonnet-4-6',
			max_tokens: 100,
			messages: [{ role: 'user', content: 'hi' }],
		})) as Anthropic.Messages.Message

		expect(mock).toHaveBeenCalledOnce()
		expect(result.id).toBe('msg_test')
	})
})

describe('makeAnthropicMessage', () => {
	it('returns a complete Anthropic.Messages.Message from minimal overrides', () => {
		const msg = makeAnthropicMessage({ content: [] })

		expectTypeOf(msg).toEqualTypeOf<Anthropic.Messages.Message>()
		expect(msg.id).toBe('msg_test')
		expect(msg.type).toBe('message')
		expect(msg.role).toBe('assistant')
		expect(msg.stop_reason).toBe('end_turn')
		expect(msg.container).toBeNull()
		expect(msg.usage.input_tokens).toBe(0)
		expect(msg.usage.output_tokens).toBe(0)
	})

	it('lets callers override any field', () => {
		const msg = makeAnthropicMessage({
			id: 'msg_custom',
			stop_reason: 'max_tokens',
			content: [],
			usage: {
				input_tokens: 100,
				output_tokens: 200,
				cache_creation: null,
				cache_creation_input_tokens: null,
				cache_read_input_tokens: null,
				inference_geo: null,
				server_tool_use: null,
				service_tier: null,
			},
		})

		expect(msg.id).toBe('msg_custom')
		expect(msg.stop_reason).toBe('max_tokens')
		expect(msg.usage.output_tokens).toBe(200)
	})
})

describe('makeToolUseBlock', () => {
	it('returns a well-formed ToolUseBlock with a direct caller', () => {
		const block = makeToolUseBlock('write_file', { path: 'a.ts', content: 'x' })

		expectTypeOf(block).toEqualTypeOf<Anthropic.Messages.ToolUseBlock>()
		expect(block.type).toBe('tool_use')
		expect(block.name).toBe('write_file')
		expect(block.input).toEqual({ path: 'a.ts', content: 'x' })
		expect(block.caller).toEqual({ type: 'direct' })
	})
})

describe('makeTextBlock', () => {
	it('returns a well-formed TextBlock with null citations', () => {
		const block = makeTextBlock('hello world')

		expectTypeOf(block).toEqualTypeOf<Anthropic.Messages.TextBlock>()
		expect(block.type).toBe('text')
		expect(block.text).toBe('hello world')
		expect(block.citations).toBeNull()
	})
})
