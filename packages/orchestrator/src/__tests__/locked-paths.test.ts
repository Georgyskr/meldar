import type Anthropic from '@anthropic-ai/sdk'
import { InMemoryBlobStorage, InMemoryProjectStorage, type ProjectStorage } from '@meldar/storage'
import { type AnthropicMockResult, makeAnthropicMock } from '@meldar/test-utils'
import { InMemoryTokenLedger, type TokenLedger } from '@meldar/tokens'
import { describe, expect, it } from 'vitest'
import { type OrchestratorDeps, orchestrateBuild } from '../engine'
import { LOCKED_STARTER_PATHS, STARTER_FILES } from '../starter-files'
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

function makeToolUseMock(toolUses: { path: string; content: string }[]): AnthropicMockResult {
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
		initialFiles: [{ path: 'src/app/page.tsx', content: 'export default function Page() {}' }],
	})

	return {
		storage,
		ledger,
		projectId: created.project.id,
		userId: 'user_1',
	}
}

describe('LOCKED_STARTER_PATHS enforcement', () => {
	it('skips writes to locked paths like package.json', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{ path: 'package.json', content: '{"hacked": true}' },
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>ok</div> }',
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
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'hack it' },
				deps,
			),
		)

		const fileWritten = events.filter((e) => e.type === 'file_written')
		const writtenPaths = fileWritten.map((e) => (e.type === 'file_written' ? e.path : ''))

		expect(writtenPaths).not.toContain('package.json')
		expect(writtenPaths).toContain('src/app/page.tsx')
	})

	it('still commits when all non-locked files are written', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{ path: 'panda.config.ts', content: 'hacked' },
			{ path: 'src/components/new.tsx', content: 'export function New() {}' },
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add component' },
				deps,
			),
		)

		const types = events.map((e) => e.type)
		expect(types).toContain('committed')

		const committed = events.find((e) => e.type === 'committed')
		if (committed?.type !== 'committed') throw new Error('expected committed')
		expect(committed.fileCount).toBe(1)
	})

	it('emits failed when ALL tool_use writes target locked paths', async () => {
		const fixture = await setupFixture()
		const { client: anthropic } = makeToolUseMock([
			{ path: 'package.json', content: 'hacked' },
			{ path: 'tsconfig.json', content: 'hacked' },
		])

		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'hack everything' },
				deps,
			),
		)

		const failed = events[events.length - 1]
		expect(failed.type).toBe('failed')
	})

	it('starter files do not reference process.env', () => {
		for (const file of STARTER_FILES) {
			expect(file.content).not.toContain('process.env')
		}
	})

	it('verifies LOCKED_STARTER_PATHS contains expected config files', () => {
		expect(LOCKED_STARTER_PATHS.has('package.json')).toBe(true)
		expect(LOCKED_STARTER_PATHS.has('panda.config.ts')).toBe(true)
		expect(LOCKED_STARTER_PATHS.has('tsconfig.json')).toBe(true)
		expect(LOCKED_STARTER_PATHS.has('next.config.ts')).toBe(true)
		expect(LOCKED_STARTER_PATHS.has('src/app/layout.tsx')).toBe(true)
	})
})
