import type Anthropic from '@anthropic-ai/sdk'
import { InMemoryBlobStorage, InMemoryProjectStorage, type ProjectStorage } from '@meldar/storage'
import { makeAnthropicMock } from '@meldar/test-utils'
import { InMemoryTokenLedger, type TokenLedger } from '@meldar/tokens'
import { describe, expect, it } from 'vitest'
import { type OrchestratorDeps, orchestrateBuild } from '../engine'
import type { OrchestratorEvent } from '../types'

const EMPTY_USAGE: Anthropic.Messages.Usage = {
	input_tokens: 0,
	output_tokens: 0,
	cache_creation: null,
	cache_creation_input_tokens: null,
	cache_read_input_tokens: null,
	inference_geo: null,
	server_tool_use: null,
	service_tier: null,
}

function makeToolUseMock(toolUses: { path: string; content: string }[]) {
	return makeAnthropicMock(async () => ({
		id: 'msg_test',
		type: 'message',
		role: 'assistant',
		model: 'claude-sonnet-4-6',
		stop_reason: 'end_turn',
		stop_sequence: null,
		container: null,
		content: toolUses.map((t, i) => ({
			type: 'tool_use' as const,
			id: `tool_${i}`,
			name: 'write_file',
			input: t,
			caller: { type: 'direct' },
		})),
		usage: { ...EMPTY_USAGE, input_tokens: 1000, output_tokens: 500 },
	}))
}

async function collectEvents(
	gen: AsyncGenerator<OrchestratorEvent, void, unknown>,
): Promise<OrchestratorEvent[]> {
	const events: OrchestratorEvent[] = []
	for await (const e of gen) {
		events.push(e)
	}
	return events
}

async function setupFixture(): Promise<{
	storage: ProjectStorage
	ledger: TokenLedger
	projectId: string
	userId: string
}> {
	const blob = new InMemoryBlobStorage()
	const storage = new InMemoryProjectStorage(blob)
	const ledger = new InMemoryTokenLedger({ ceilingCentsPerDay: 200 })

	const created = await storage.createProject({
		userId: 'user_1',
		name: 'Test project',
		templateId: 'next-landing-v1',
		initialFiles: [
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>hi</div> }',
			},
		],
	})

	return {
		storage,
		ledger,
		projectId: created.project.id,
		userId: 'user_1',
	}
}

describe('build file validation in orchestrateBuild', () => {
	it('fails build when AI writes a file importing a forbidden package', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/components/Animate.tsx',
				content: `import { motion } from 'framer-motion'\nexport function Animate() { return <motion.div /> }`,
			},
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add animation' },
				deps,
			),
		)

		const failed = events.find((e) => e.type === 'failed')
		expect(failed).toBeDefined()
		expect(failed?.type === 'failed' && failed.code).toBe('validation_failed')
	})

	it('fails build when AI writes to app/api/ directory', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'app/api/route.ts',
				content: `export async function GET() { return Response.json({ ok: true }) }`,
			},
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add api' },
				deps,
			),
		)

		const failed = events.find((e) => e.type === 'failed')
		expect(failed).toBeDefined()
		expect(failed?.type === 'failed' && failed.code).toBe('validation_failed')
	})

	it('succeeds when AI writes valid files', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/components/Card.tsx',
				content: `import { Box } from 'styled-system/jsx'\nexport function Card() { return <Box padding="4">Hello</Box> }`,
			},
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add card' },
				deps,
			),
		)

		const types = events.map((e) => e.type)
		expect(types).toContain('committed')
		expect(types).not.toContain('failed')
	})

	it('includes the specific validation error in the failure reason', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/lib/run.ts',
				content: `export function run(code: string) { return eval(code) }`,
			},
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add runner' },
				deps,
			),
		)

		const failed = events.find((e) => e.type === 'failed')
		expect(failed?.type === 'failed' && failed.reason).toContain('eval')
	})
})
