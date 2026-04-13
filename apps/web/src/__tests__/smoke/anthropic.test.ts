import { BUILD_SYSTEM_PROMPT, routeModel, WRITE_FILE_TOOL } from '@meldar/orchestrator'
import { MODELS } from '@meldar/tokens'
import { createAnthropicClient, HAS_ANTHROPIC } from './setup'

describe.skipIf(!HAS_ANTHROPIC)('anthropic smoke — real API calls', () => {
	const client = HAS_ANTHROPIC ? createAnthropicClient() : (null as never)

	it('haiku reachability', async () => {
		const response = await client.messages.create({
			model: MODELS.HAIKU,
			max_tokens: 32,
			messages: [{ role: 'user', content: 'Reply with exactly: HAIKU_SMOKE_OK' }],
		})

		const text = (response.content[0] as { type: 'text'; text: string }).text
		expect(text).toContain('HAIKU_SMOKE_OK')
	})

	it('sonnet reachability', async () => {
		const response = await client.messages.create({
			model: MODELS.SONNET,
			max_tokens: 32,
			messages: [{ role: 'user', content: 'Reply with exactly: SONNET_SMOKE_OK' }],
		})

		const text = (response.content[0] as { type: 'text'; text: string }).text
		expect(text).toContain('SONNET_SMOKE_OK')
	})

	it('sonnet with real BUILD_SYSTEM_PROMPT produces tool_use', async () => {
		const response = await client.messages.create({
			model: MODELS.SONNET,
			max_tokens: 4096,
			system: BUILD_SYSTEM_PROMPT,
			tools: [WRITE_FILE_TOOL],
			messages: [{ role: 'user', content: 'Add a hero section with a heading and a paragraph' }],
		})

		const toolUseBlock = response.content.find(
			(block) => block.type === 'tool_use' && block.name === 'write_file',
		)
		expect(toolUseBlock).toBeDefined()
	}, 60_000)

	it('routeModel returns valid IDs', () => {
		const validModels = Object.values(MODELS)

		expect(validModels).toContain(routeModel('chart'))
		expect(validModels).toContain(routeModel('form'))
		expect(validModels).toContain(routeModel(undefined))
		expect(validModels).toContain(routeModel('unknown-component'))
	})
})
