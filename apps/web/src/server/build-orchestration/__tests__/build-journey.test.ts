import type Anthropic from '@anthropic-ai/sdk'
import {
	consumeSseStream,
	formatSseDone,
	formatSseEvent,
	type OrchestratorDeps,
	type OrchestratorEvent,
	orchestrateBuild,
} from '@meldar/orchestrator'
import { InMemoryBlobStorage, InMemoryProjectStorage, type ProjectStorage } from '@meldar/storage'
import { type AnthropicMockResult, makeAnthropicMock } from '@meldar/test-utils'
import { InMemoryTokenLedger, type TokenLedger } from '@meldar/tokens'
import { beforeEach, describe, expect, it } from 'vitest'

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

function orchestratorToSseStream(
	gen: AsyncGenerator<OrchestratorEvent, void, unknown>,
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await gen.next()
			if (done) {
				controller.enqueue(encoder.encode(formatSseDone()))
				controller.close()
				return
			}
			controller.enqueue(encoder.encode(formatSseEvent(value)))
		},
	})
}

async function collectSseEvents(stream: ReadableStream<Uint8Array>): Promise<OrchestratorEvent[]> {
	const events: OrchestratorEvent[] = []
	for await (const event of consumeSseStream(stream)) {
		events.push(event)
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

function makeDeps(
	fixture: { storage: ProjectStorage; ledger: TokenLedger },
	anthropic: Anthropic,
): OrchestratorDeps {
	return {
		storage: fixture.storage,
		sandbox: null,
		ledger: fixture.ledger,
		anthropic,
	}
}

describe('build journey (integration)', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('full build journey: create project -> apply template cards -> build -> SSE events', async () => {
		await fixture.storage.createKanbanCard({
			projectId: fixture.projectId,
			title: 'Dashboard layout',
			description: 'Home screen showing stats',
			taskType: 'page',
			generatedBy: 'template',
		})
		const subtask = await fixture.storage.createKanbanCard({
			projectId: fixture.projectId,
			title: 'Navigation menu',
			description: 'Switch between screens',
			taskType: 'page',
			generatedBy: 'template',
		})

		const cards = await fixture.storage.getKanbanCards(fixture.projectId)
		expect(cards.length).toBe(2)

		const writtenFiles = [
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>Dashboard</div> }',
			},
			{
				path: 'src/components/nav.tsx',
				content: 'export function Nav() { return <nav>Menu</nav> }',
			},
			{
				path: 'src/components/stats.tsx',
				content: 'export function Stats() { return <div>Stats</div> }',
			},
		]
		const { client: anthropic } = makeToolUseMock(writtenFiles)
		const deps = makeDeps(fixture, anthropic)

		const gen = orchestrateBuild(
			{
				projectId: fixture.projectId,
				userId: fixture.userId,
				prompt: 'Build the dashboard with navigation and stats',
				kanbanCardId: subtask.id,
			},
			deps,
		)
		const stream = orchestratorToSseStream(gen)
		const events = await collectSseEvents(stream)

		const types = events.map((e) => e.type)
		expect(types).toEqual([
			'started',
			'prompt_sent',
			'file_written',
			'file_written',
			'file_written',
			'committed',
		])

		const started = events.find((e) => e.type === 'started')
		if (started?.type !== 'started') throw new Error('expected started event')
		expect(started.projectId).toBe(fixture.projectId)
		expect(started.kanbanCardId).toBe(subtask.id)

		const fileEvents = events.filter((e) => e.type === 'file_written')
		expect(fileEvents).toHaveLength(3)
		for (const fe of fileEvents) {
			if (fe.type !== 'file_written') throw new Error('expected file_written')
			expect(fe.sizeBytes).toBeGreaterThan(0)
			expect(fe.contentHash).toMatch(/^[0-9a-f]{64}$/)
		}

		const committed = events.find((e) => e.type === 'committed')
		if (committed?.type !== 'committed') throw new Error('expected committed event')
		expect(committed.fileCount).toBe(3)
		expect(committed.tokenCost).toBe(1500)
		expect(committed.actualCents).toBeGreaterThan(0)
		expect(committed.kanbanCardId).toBe(subtask.id)

		const liveFiles = await fixture.storage.getCurrentFiles(fixture.projectId)
		const livePaths = liveFiles.map((f) => f.path).sort()
		expect(livePaths).toContain('src/app/page.tsx')
		expect(livePaths).toContain('src/components/nav.tsx')
		expect(livePaths).toContain('src/components/stats.tsx')

		const pageContent = await fixture.storage.readFile(fixture.projectId, 'src/app/page.tsx')
		expect(pageContent).toContain('Dashboard')

		const buildRecord = await fixture.storage.getBuild(fixture.projectId, started.buildId)
		expect(buildRecord.status).toBe('completed')
		expect(buildRecord.tokenCost).toBe(1500)
	})

	it('build with unsafe path traversal triggers failed event via SSE', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: '../etc/passwd', content: 'root:x:0:0' },
		])
		const deps = makeDeps(fixture, anthropic)

		const gen = orchestrateBuild(
			{
				projectId: fixture.projectId,
				userId: fixture.userId,
				prompt: 'write a file',
			},
			deps,
		)
		const stream = orchestratorToSseStream(gen)
		const events = await collectSseEvents(stream)

		const failed = events[events.length - 1]
		expect(failed.type).toBe('failed')
		if (failed.type === 'failed') {
			expect(failed.reason).toContain('..')
		}

		const project = await fixture.storage.getProject(fixture.projectId, fixture.userId)
		if (!project.currentBuildId) throw new Error('expected currentBuildId')
		const headBuild = await fixture.storage.getBuild(fixture.projectId, project.currentBuildId)
		expect(headBuild.triggeredBy).toBe('template')
	})

	it('build with reserved path segment (node_modules) triggers failed event via SSE', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: 'node_modules/evil/index.js', content: 'module.exports = {}' },
		])
		const deps = makeDeps(fixture, anthropic)

		const gen = orchestrateBuild(
			{
				projectId: fixture.projectId,
				userId: fixture.userId,
				prompt: 'install a package',
			},
			deps,
		)
		const stream = orchestratorToSseStream(gen)
		const events = await collectSseEvents(stream)

		const failed = events[events.length - 1]
		expect(failed.type).toBe('failed')
		if (failed.type === 'failed') {
			expect(failed.reason).toContain('node_modules')
		}
	})

	it('deploy gracefully skips when no sandbox provider is set', async () => {
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <main>Hello</main> }',
			},
		])
		const deps: OrchestratorDeps = {
			storage: fixture.storage,
			sandbox: null,
			ledger: fixture.ledger,
			anthropic,
		}

		const gen = orchestrateBuild(
			{
				projectId: fixture.projectId,
				userId: fixture.userId,
				prompt: 'update the page',
			},
			deps,
		)
		const stream = orchestratorToSseStream(gen)
		const events = await collectSseEvents(stream)

		const types = events.map((e) => e.type)
		expect(types).toContain('committed')
		expect(types).not.toContain('sandbox_ready')

		const committed = events.find((e) => e.type === 'committed')
		if (committed?.type !== 'committed') throw new Error('expected committed')
		expect(committed.fileCount).toBe(1)

		const buildRecord = await fixture.storage.getBuild(fixture.projectId, committed.buildId)
		expect(buildRecord.status).toBe('completed')
	})
})
