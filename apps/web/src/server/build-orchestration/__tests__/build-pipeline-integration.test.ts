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
import {
	type AnthropicMockResult,
	makeAnthropicMessage,
	makeAnthropicMock,
	makeToolUseBlock,
} from '@meldar/test-utils'
import { InMemoryTokenLedger, type TokenLedger } from '@meldar/tokens'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

function makeToolUseMock(
	toolUses: { path: string; content: string }[],
	usageOverrides?: Partial<Anthropic.Messages.Usage>,
): AnthropicMockResult {
	return makeAnthropicMock(async () =>
		makeAnthropicMessage({
			content: toolUses.map((t, i) => makeToolUseBlock('write_file', t, `tool_${i}`)),
			usage: { ...EMPTY_USAGE, input_tokens: 1000, output_tokens: 500, ...usageOverrides },
		}),
	)
}

async function collectEvents(
	gen: AsyncGenerator<OrchestratorEvent, void, unknown>,
): Promise<OrchestratorEvent[]> {
	const events: OrchestratorEvent[] = []
	for await (const e of gen) events.push(e)
	return events
}

async function setupFixture(initialFiles?: { path: string; content: string }[]): Promise<{
	storage: ProjectStorage
	blob: InMemoryBlobStorage
	ledger: InMemoryTokenLedger
	projectId: string
	userId: string
}> {
	const blob = new InMemoryBlobStorage()
	const storage = new InMemoryProjectStorage(blob)
	const ledger = new InMemoryTokenLedger({ ceilingCentsPerDay: 500 })

	const created = await storage.createProject({
		userId: 'user_1',
		name: 'Integration test project',
		templateId: 'next-landing-v1',
		initialFiles: initialFiles ?? [
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>Hello</div> }',
			},
		],
	})

	return {
		storage,
		blob,
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

describe('realistic AI output passes validation and commits', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('commits multiple realistic files and makes them readable from storage', async () => {
		const pageContent = `'use client'

import { Box, VStack } from 'styled-system/jsx'

export default function Page() {
  return (
    <Box paddingBlockStart="8" paddingInline="6">
      <VStack gap="4" alignItems="center">
        <h1>Dashboard</h1>
      </VStack>
    </Box>
  )
}`

		const dashboardContent = `'use client'

import { useState } from 'react'
import { Box, Flex } from 'styled-system/jsx'

export function Dashboard() {
  const [count, setCount] = useState(0)
  return (
    <Flex gap="4" direction="column">
      <Box>Count: {count}</Box>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </Flex>
  )
}`

		const utilsContent = `export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}`

		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx', content: pageContent },
			{ path: 'src/components/Dashboard.tsx', content: dashboardContent },
			{ path: 'src/lib/utils.ts', content: utilsContent },
		])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'build a dashboard' },
				makeDeps(fixture, anthropic),
			),
		)

		const types = events.map((e) => e.type)
		expect(types).toContain('started')
		expect(types).toContain('committed')

		const fileWrittenEvents = events.filter((e) => e.type === 'file_written')
		expect(fileWrittenEvents).toHaveLength(3)

		const committed = events.find((e) => e.type === 'committed')
		if (committed?.type !== 'committed') throw new Error('expected committed')
		expect(committed.fileCount).toBe(3)

		const readPage = await fixture.storage.readFile(fixture.projectId, 'src/app/page.tsx')
		expect(readPage).toBe(pageContent)

		const readDashboard = await fixture.storage.readFile(
			fixture.projectId,
			'src/components/Dashboard.tsx',
		)
		expect(readDashboard).toBe(dashboardContent)

		const readUtils = await fixture.storage.readFile(fixture.projectId, 'src/lib/utils.ts')
		expect(readUtils).toBe(utilsContent)
	})

	it('file_written events carry correct contentHash and sizeBytes', async () => {
		const content = 'export const VERSION = "1.0.0"'
		const { client: anthropic } = makeToolUseMock([{ path: 'src/lib/version.ts', content }])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add version' },
				makeDeps(fixture, anthropic),
			),
		)

		const fw = events.find((e) => e.type === 'file_written' && e.path === 'src/lib/version.ts')
		if (fw?.type !== 'file_written') throw new Error('expected file_written')

		expect(fw.contentHash).toMatch(/^[0-9a-f]{64}$/)
		expect(fw.sizeBytes).toBe(new TextEncoder().encode(content).length)
	})
})

describe('second build on same project sees files from first build', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('preserves untouched files, updates modified files, and adds new files', async () => {
		const fileA = 'export function helperA() { return "a" }'
		const fileB = 'export function helperB() { return "b" }'
		const fileC = 'export function helperC() { return "c" }'

		const { client: anthropic1 } = makeToolUseMock([
			{ path: 'src/lib/a.ts', content: fileA },
			{ path: 'src/lib/b.ts', content: fileB },
			{ path: 'src/lib/c.ts', content: fileC },
		])

		const events1 = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'write helpers' },
				makeDeps(fixture, anthropic1),
			),
		)
		expect(events1.some((e) => e.type === 'committed')).toBe(true)

		const filesAfterBuild1 = await fixture.storage.getCurrentFiles(fixture.projectId)
		const pathsAfterBuild1 = filesAfterBuild1.map((f) => f.path).sort()
		expect(pathsAfterBuild1).toContain('src/lib/a.ts')
		expect(pathsAfterBuild1).toContain('src/lib/b.ts')
		expect(pathsAfterBuild1).toContain('src/lib/c.ts')
		expect(pathsAfterBuild1).toContain('src/app/page.tsx')

		const modifiedB = 'export function helperB() { return "b_v2" }'
		const newFileD = 'export function helperD() { return "d" }'

		const { client: anthropic2 } = makeToolUseMock([
			{ path: 'src/lib/b.ts', content: modifiedB },
			{ path: 'src/lib/d.ts', content: newFileD },
		])

		const events2 = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'update b, add d' },
				makeDeps(fixture, anthropic2),
			),
		)

		const committed2 = events2.find((e) => e.type === 'committed')
		if (committed2?.type !== 'committed') throw new Error('expected committed')
		expect(committed2.fileCount).toBe(2)

		const readB = await fixture.storage.readFile(fixture.projectId, 'src/lib/b.ts')
		expect(readB).toBe(modifiedB)

		const readD = await fixture.storage.readFile(fixture.projectId, 'src/lib/d.ts')
		expect(readD).toBe(newFileD)

		const readA = await fixture.storage.readFile(fixture.projectId, 'src/lib/a.ts')
		expect(readA).toBe(fileA)

		const readC = await fixture.storage.readFile(fixture.projectId, 'src/lib/c.ts')
		expect(readC).toBe(fileC)

		const readPage = await fixture.storage.readFile(fixture.projectId, 'src/app/page.tsx')
		expect(readPage).toContain('Hello')
	})

	it('second build references the first build as parentBuildId', async () => {
		const { client: anthropic1 } = makeToolUseMock([
			{ path: 'src/lib/x.ts', content: 'export const x = 1' },
		])
		const events1 = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'first' },
				makeDeps(fixture, anthropic1),
			),
		)
		const committed1 = events1.find((e) => e.type === 'committed')
		if (committed1?.type !== 'committed') throw new Error('expected committed')
		const build1Id = committed1.buildId

		const { client: anthropic2 } = makeToolUseMock([
			{ path: 'src/lib/y.ts', content: 'export const y = 2' },
		])
		const events2 = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'second' },
				makeDeps(fixture, anthropic2),
			),
		)
		const started2 = events2.find((e) => e.type === 'started')
		if (started2?.type !== 'started') throw new Error('expected started')

		const build2 = await fixture.storage.getBuild(fixture.projectId, started2.buildId)
		expect(build2.parentBuildId).toBe(build1Id)
	})

	it('Anthropic receives the current project files in the prompt', async () => {
		const { client: anthropic1 } = makeToolUseMock([
			{ path: 'src/lib/existing.ts', content: 'export const EXISTING = true' },
		])
		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'first' },
				makeDeps(fixture, anthropic1),
			),
		)

		const { client: anthropic2, mock } = makeToolUseMock([
			{ path: 'src/lib/new.ts', content: 'export const NEW = true' },
		])
		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'second' },
				makeDeps(fixture, anthropic2),
			),
		)

		expect(mock).toHaveBeenCalledTimes(1)
		const callBody = mock.mock.calls[0][0]
		const userContent = callBody.messages[0].content
		const textParts = (userContent as Anthropic.Messages.ContentBlockParam[]).filter(
			(b): b is Anthropic.Messages.TextBlockParam => b.type === 'text',
		)
		const fullText = textParts.map((t) => t.text).join('\n')
		expect(fullText).toContain('src/lib/existing.ts')
		expect(fullText).toContain('EXISTING')
	})
})

describe('path safety validation rejects dangerous AI output', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	const dangerousPaths = [
		{ path: '../etc/passwd', label: 'path traversal with ..' },
		{ path: 'src/../../../etc/shadow', label: 'nested path traversal' },
		{ path: 'node_modules/evil/index.js', label: 'write to node_modules' },
		{ path: '.env', label: 'write to .env' },
		{ path: '.env.local', label: 'write to .env.local' },
		{ path: '.env.production', label: 'write to .env.production' },
		{ path: '.git/config', label: 'write to .git directory' },
		{ path: '.next/server/page.js', label: 'write to .next build output' },
		{ path: '.vercel/project.json', label: 'write to .vercel config' },
		{ path: '/etc/passwd', label: 'absolute path' },
		{ path: 'src/./app/page.tsx', label: 'redundant dot segment' },
		{ path: 'dist/bundle.js', label: 'write to dist directory' },
		{ path: '.turbo/cache.json', label: 'write to .turbo directory' },
	]

	for (const { path: dangerousPath, label } of dangerousPaths) {
		it(`rejects: ${label} (${dangerousPath})`, async () => {
			const { client: anthropic } = makeToolUseMock([
				{ path: dangerousPath, content: 'malicious content' },
			])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					makeDeps(fixture, anthropic),
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
		})
	}

	it('rejects path with backslash (Windows-style)', async () => {
		const { client: anthropic } = makeToolUseMock([{ path: 'src\\app\\page.tsx', content: 'x' }])
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)
		expect(events[events.length - 1].type).toBe('failed')
	})

	it('rejects path with null byte injection', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx\0.jpg', content: 'x' },
		])
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)
		expect(events[events.length - 1].type).toBe('failed')
	})

	it('rejects empty path', async () => {
		const { client: anthropic } = makeAnthropicMock(async () =>
			makeAnthropicMessage({
				content: [makeToolUseBlock('write_file', { path: '', content: 'x' })],
				usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: 50 },
			}),
		)
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)
		expect(events[events.length - 1].type).toBe('failed')
	})

	it('rejects path with control characters', async () => {
		const { client: anthropic } = makeToolUseMock([{ path: 'src/app/page\x01.tsx', content: 'x' }])
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)
		expect(events[events.length - 1].type).toBe('failed')
	})

	it('accepts valid safe paths', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
			{ path: 'src/components/deep/nested/Widget.tsx', content: 'export function Widget() {}' },
			{ path: 'public/favicon.ico', content: 'icon' },
			{ path: 'tsconfig.json', content: '{}' },
		])
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)
		expect(events.some((e) => e.type === 'committed')).toBe(true)
	})
})

describe('SSE stream round-trip preserves all event data', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('encode → stream → decode preserves every field of every event type', async () => {
		const { client: anthropic } = makeToolUseMock(
			[
				{ path: 'src/app/page.tsx', content: 'export default function Page() { return null }' },
				{ path: 'src/lib/utils.ts', content: 'export const x = 1' },
			],
			{
				input_tokens: 2000,
				output_tokens: 800,
				cache_read_input_tokens: 500,
				cache_creation_input_tokens: 300,
			},
		)

		const originalEvents = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'build something' },
				makeDeps(fixture, anthropic),
			),
		)

		expect(originalEvents.length).toBeGreaterThanOrEqual(4)

		const wireFrames = originalEvents.map(formatSseEvent).join('') + formatSseDone()

		const encoder = new TextEncoder()
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const chunkSize = 17
				for (let i = 0; i < wireFrames.length; i += chunkSize) {
					controller.enqueue(encoder.encode(wireFrames.slice(i, i + chunkSize)))
				}
				controller.close()
			},
		})

		const decoded: OrchestratorEvent[] = []
		for await (const event of consumeSseStream(stream)) {
			decoded.push(event)
		}

		expect(decoded).toEqual(originalEvents)
	})

	it('event order is started → prompt_sent → file_written* → committed', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
			{ path: 'src/lib/a.ts', content: 'export const a = 1' },
			{ path: 'src/lib/b.ts', content: 'export const b = 2' },
		])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const types = events.map((e) => e.type)
		const startedIdx = types.indexOf('started')
		const promptSentIdx = types.indexOf('prompt_sent')
		const firstFileWrittenIdx = types.indexOf('file_written')
		const lastFileWrittenIdx = types.lastIndexOf('file_written')
		const committedIdx = types.indexOf('committed')

		expect(startedIdx).toBe(0)
		expect(promptSentIdx).toBe(1)
		expect(firstFileWrittenIdx).toBeGreaterThan(promptSentIdx)
		expect(committedIdx).toBeGreaterThan(lastFileWrittenIdx)
		expect(types.filter((t) => t === 'file_written')).toHaveLength(3)
	})

	it('committed event carries tokenCost, actualCents, fileCount, and cache fields', async () => {
		const { client: anthropic } = makeToolUseMock(
			[{ path: 'src/app/page.tsx', content: 'export default function Page() {}' }],
			{
				input_tokens: 5000,
				output_tokens: 2000,
				cache_read_input_tokens: 1000,
				cache_creation_input_tokens: 500,
			},
		)

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const committed = events.find((e) => e.type === 'committed')
		if (committed?.type !== 'committed') throw new Error('expected committed')

		expect(committed.tokenCost).toBe(5000 + 2000 + 1000 + 500)
		expect(committed.actualCents).toBeGreaterThan(0)
		expect(committed.fileCount).toBe(1)
		expect(committed.cacheReadTokens).toBe(1000)
		expect(committed.cacheWriteTokens).toBe(500)
		expect(committed.buildId).toBeDefined()
	})

	it('file_written events have monotonically increasing fileIndex', async () => {
		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/a.ts', content: 'export const a = 1' },
			{ path: 'src/b.ts', content: 'export const b = 2' },
			{ path: 'src/c.ts', content: 'export const c = 3' },
			{ path: 'src/d.ts', content: 'export const d = 4' },
		])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const fwEvents = events.filter(
			(e): e is Extract<OrchestratorEvent, { type: 'file_written' }> => e.type === 'file_written',
		)
		const indices = fwEvents.map((e) => e.fileIndex)
		expect(indices).toEqual([0, 1, 2, 3])
	})
})

describe('build without sandbox provider (deploy not configured)', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('emits committed without sandbox_ready when sandbox is null', async () => {
		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>v2</div> }',
			},
		])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'update page' },
				{
					storage: fixture.storage,
					sandbox: null,
					ledger: fixture.ledger,
					anthropic,
				},
			),
		)

		const types = events.map((e) => e.type)
		expect(types).toContain('committed')
		expect(types).not.toContain('sandbox_ready')
		expect(types).not.toContain('deploy_failed')

		const readPage = await fixture.storage.readFile(fixture.projectId, 'src/app/page.tsx')
		expect(readPage).toContain('v2')
	})

	it('sandbox failure post-commit does not prevent committed event', async () => {
		const sandbox = {
			prewarm: vi.fn().mockResolvedValue(undefined),
			start: vi.fn(),
			writeFiles: vi.fn().mockRejectedValue(new Error('sandbox unavailable')),
			getPreviewUrl: vi.fn().mockResolvedValue(null),
			stop: vi.fn().mockResolvedValue(undefined),
		}

		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
		])

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
			),
		)

		expect(events.some((e) => e.type === 'committed')).toBe(true)
		expect(events.some((e) => e.type === 'sandbox_ready')).toBe(false)
		expect(events.every((e) => e.type !== 'failed')).toBe(true)

		consoleErrorSpy.mockRestore()
	})
})

describe('token ledger behavior on build failure', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	it('ledger is not debited when Sonnet returns no tool_use blocks', async () => {
		const before = await fixture.ledger.getSnapshot(fixture.userId)

		const { client: anthropic } = makeAnthropicMock(async () =>
			makeAnthropicMessage({
				content: [{ type: 'text', text: 'I cannot help with that.', citations: null }],
				usage: { ...EMPTY_USAGE, input_tokens: 500, output_tokens: 200 },
			}),
		)

		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const after = await fixture.ledger.getSnapshot(fixture.userId)
		expect(after.spentCentsToday).toBe(before.spentCentsToday)
	})

	it('ledger is not debited when Sonnet response is truncated (max_tokens)', async () => {
		const before = await fixture.ledger.getSnapshot(fixture.userId)

		const { client: anthropic } = makeAnthropicMock(async () =>
			makeAnthropicMessage({
				stop_reason: 'max_tokens',
				content: [
					makeToolUseBlock('write_file', {
						path: 'src/app/page.tsx',
						content: 'export default funct',
					}),
				],
				usage: { ...EMPTY_USAGE, input_tokens: 100_000, output_tokens: 64_000 },
			}),
		)

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'big thing' },
				makeDeps(fixture, anthropic),
			),
		)

		expect(events[events.length - 1].type).toBe('failed')
		if (events[events.length - 1].type === 'failed') {
			expect(events[events.length - 1].code).toBe('max_tokens_truncated')
		}

		const after = await fixture.ledger.getSnapshot(fixture.userId)
		expect(after.spentCentsToday).toBe(before.spentCentsToday)
	})

	it('ledger is not debited when path safety rejects all files', async () => {
		const before = await fixture.ledger.getSnapshot(fixture.userId)

		const { client: anthropic } = makeToolUseMock([{ path: '../etc/passwd', content: 'pwned' }])

		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const after = await fixture.ledger.getSnapshot(fixture.userId)
		expect(after.spentCentsToday).toBe(before.spentCentsToday)
	})

	it('ledger IS debited on a successful build', async () => {
		const before = await fixture.ledger.getSnapshot(fixture.userId)

		const { client: anthropic } = makeToolUseMock([
			{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
		])

		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const after = await fixture.ledger.getSnapshot(fixture.userId)
		expect(after.spentCentsToday).toBeGreaterThan(before.spentCentsToday)
	})

	it('pre-flight ceiling check prevents Sonnet call when budget is insufficient', async () => {
		await fixture.ledger.tryDebit(fixture.userId, 400)

		const { client: anthropic, mock } = makeAnthropicMock(async () => {
			throw new Error('should not be called')
		})

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		expect(events[events.length - 1].type).toBe('failed')
		if (events[events.length - 1].type === 'failed') {
			expect(events[events.length - 1].code).toBe('ceiling_exhausted')
		}
		expect(mock).not.toHaveBeenCalled()
	})
})

describe('edge cases', () => {
	it('first build on a project with only the genesis file works', async () => {
		const fixture = await setupFixture([
			{ path: 'src/app/page.tsx', content: 'export default function Page() {}' },
		])

		const { client: anthropic } = makeToolUseMock([
			{
				path: 'src/app/page.tsx',
				content: 'export default function Page() { return <div>Updated</div> }',
			},
			{
				path: 'src/app/layout.tsx',
				content:
					'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html> }',
			},
		])

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'set up layout' },
				makeDeps(fixture, anthropic),
			),
		)

		expect(events.some((e) => e.type === 'committed')).toBe(true)
		const files = await fixture.storage.getCurrentFiles(fixture.projectId)
		expect(files.map((f) => f.path).sort()).toEqual(['src/app/page.tsx'])
	})

	it('build on project with many existing files includes all in Anthropic prompt', async () => {
		const initialFiles = Array.from({ length: 20 }, (_, i) => ({
			path: `src/components/Component${i}.tsx`,
			content: `export function Component${i}() { return <div>Component ${i}</div> }`,
		}))
		initialFiles.push({
			path: 'src/app/page.tsx',
			content: 'export default function Page() {}',
		})

		const fixture = await setupFixture(initialFiles)

		const { client: anthropic, mock } = makeToolUseMock([
			{ path: 'src/components/Component21.tsx', content: 'export function Component21() {}' },
		])

		await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'add component 21' },
				makeDeps(fixture, anthropic),
			),
		)

		expect(mock).toHaveBeenCalledTimes(1)
		const callBody = mock.mock.calls[0][0]
		const userContent = callBody.messages[0].content
		const textParts = (userContent as Anthropic.Messages.ContentBlockParam[]).filter(
			(b): b is Anthropic.Messages.TextBlockParam => b.type === 'text',
		)
		const fullText = textParts.map((t) => t.text).join('\n')

		for (let i = 0; i < 20; i++) {
			expect(fullText).toContain(`Component${i}`)
		}
	})

	it('Zod rejects tool_use with missing content field', async () => {
		const f = await setupFixture()
		const { client: anthropic } = makeAnthropicMock(async () =>
			makeAnthropicMessage({
				content: [makeToolUseBlock('write_file', { path: 'src/app/page.tsx' })],
				usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: 50 },
			}),
		)

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: f.projectId, userId: f.userId, prompt: 'p' },
				makeDeps(f, anthropic),
			),
		)

		expect(events[events.length - 1].type).toBe('failed')
	})

	it('Zod rejects tool_use with numeric path', async () => {
		const { client: anthropic } = makeAnthropicMock(async () =>
			makeAnthropicMessage({
				content: [
					makeToolUseBlock('write_file', { path: 42, content: 'x' } as unknown as Record<
						string,
						unknown
					>),
				],
				usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: 50 },
			}),
		)

		const fixture = await setupFixture()
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				makeDeps(fixture, anthropic),
			),
		)

		const failed = events[events.length - 1]
		expect(failed.type).toBe('failed')
		if (failed.type === 'failed') {
			expect(failed.reason).toContain('Zod')
		}
	})

	it('build with abort signal stops the pipeline', async () => {
		const ctrl = new AbortController()
		ctrl.abort()

		const { client: anthropic } = makeAnthropicMock(async (_body, opts) => {
			if (opts?.signal?.aborted) {
				const err = new Error('Request was aborted.')
				err.name = 'AbortError'
				throw err
			}
			return makeAnthropicMessage({
				content: [],
				usage: EMPTY_USAGE,
			})
		})

		const fixture = await setupFixture()
		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p', signal: ctrl.signal },
				makeDeps(fixture, anthropic),
			),
		)

		const failed = events[events.length - 1]
		expect(failed.type).toBe('failed')
		if (failed.type === 'failed') {
			expect(failed.code).toBe('aborted')
		}
	})

	it('global spend guard blocks build when paused', async () => {
		const fixture = await setupFixture()
		const { client: anthropic, mock } = makeAnthropicMock(async () => {
			throw new Error('should not be called')
		})

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				{
					storage: fixture.storage,
					sandbox: null,
					ledger: fixture.ledger,
					anthropic,
					globalSpendGuard: {
						check: async () => ({
							allowed: false as const,
							reason: 'paused' as const,
							spentToday: 0,
							ceiling: 100,
						}),
						record: async () => {},
					},
				},
			),
		)

		expect(events[events.length - 1].type).toBe('failed')
		if (events[events.length - 1].type === 'failed') {
			expect(events[events.length - 1].code).toBe('provider_paused')
		}
		expect(mock).not.toHaveBeenCalled()
	})

	it('global spend guard blocks build when ceiling exceeded', async () => {
		const fixture = await setupFixture()
		const { client: anthropic, mock } = makeAnthropicMock(async () => {
			throw new Error('should not be called')
		})

		const events = await collectEvents(
			orchestrateBuild(
				{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
				{
					storage: fixture.storage,
					sandbox: null,
					ledger: fixture.ledger,
					anthropic,
					globalSpendGuard: {
						check: async () => ({
							allowed: false as const,
							reason: 'ceiling_exceeded' as const,
							spentToday: 100,
							ceiling: 100,
						}),
						record: async () => {},
					},
				},
			),
		)

		expect(events[events.length - 1].type).toBe('failed')
		if (events[events.length - 1].type === 'failed') {
			expect(events[events.length - 1].code).toBe('global_ceiling_exhausted')
		}
		expect(mock).not.toHaveBeenCalled()
	})
})
