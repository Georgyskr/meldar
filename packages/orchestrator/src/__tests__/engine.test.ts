import type Anthropic from '@anthropic-ai/sdk'
import type { SandboxProvider } from '@meldar/sandbox'
import { InMemoryBlobStorage, InMemoryProjectStorage, type ProjectStorage } from '@meldar/storage'
import { type AnthropicMockResult, makeAnthropicMock } from '@meldar/test-utils'
import { InMemoryTokenLedger, type TokenLedger } from '@meldar/tokens'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type OrchestratorDeps, orchestrateBuild } from '../engine'
import { MAX_OUTPUT_TOKENS_PER_BUILD, type OrchestratorEvent } from '../types'

function makeStubSandbox(overrides: Partial<SandboxProvider> = {}): SandboxProvider {
	return {
		prewarm: vi.fn().mockResolvedValue(undefined),
		start: vi.fn(),
		writeFiles: vi.fn(),
		getPreviewUrl: vi.fn().mockResolvedValue(null),
		stop: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} satisfies SandboxProvider
}

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

function makeTextOnlyMock(text: string): AnthropicMockResult {
	return makeAnthropicMock(async () => ({
		id: 'msg_test',
		type: 'message',
		role: 'assistant',
		model: 'claude-sonnet-4-6',
		stop_reason: 'end_turn',
		stop_sequence: null,
		container: null,
		content: [{ type: 'text', text, citations: null }],
		usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: 50 },
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

describe('orchestrateBuild', () => {
	let fixture: Awaited<ReturnType<typeof setupFixture>>

	beforeEach(async () => {
		fixture = await setupFixture()
	})

	describe('happy path', () => {
		it('emits started → prompt_sent → file_written* → committed for a successful build', async () => {
			const { client: anthropic } = makeToolUseMock([
				{
					path: 'src/app/page.tsx',
					content: 'export default function Page() { return <div>Hi</div> }',
				},
				{ path: 'src/components/button.tsx', content: 'export function Button() {}' },
			])
			const deps: OrchestratorDeps = {
				storage: fixture.storage,
				sandbox: null,
				ledger: fixture.ledger,
				anthropic,
			}

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'add a button',
					},
					deps,
				),
			)

			const types = events.map((e) => e.type)
			expect(types).toEqual(['started', 'prompt_sent', 'file_written', 'file_written', 'committed'])

			const committed = events.find((e) => e.type === 'committed')
			if (committed?.type !== 'committed') throw new Error('expected committed event')
			expect(committed.fileCount).toBe(2)
			expect(committed.tokenCost).toBe(1500)
			expect(committed.actualCents).toBeGreaterThan(0)
		})

		it('updates project HEAD after a successful commit', async () => {
			const { client: anthropic } = makeToolUseMock([
				{
					path: 'src/app/page.tsx',
					content: 'export default function Page() { return <div>v2</div> }',
				},
			])
			const project0 = await fixture.storage.getProject(fixture.projectId, fixture.userId)

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'change the page',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const project1 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			expect(project1.currentBuildId).not.toBe(project0.currentBuildId)

			const live = await fixture.storage.readFile(fixture.projectId, 'src/app/page.tsx')
			expect(live).toContain('v2')
		})

		it('debits the token ledger by the actual cost', async () => {
			const { client: anthropic } = makeToolUseMock([
				{
					path: 'src/app/page.tsx',
					content: 'export default function Page() { return <div>hi</div> }',
				},
			])
			const before = await fixture.ledger.getSnapshot(fixture.userId)

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const after = await fixture.ledger.getSnapshot(fixture.userId)
			expect(after.spentCentsToday).toBeGreaterThan(before.spentCentsToday)
		})

		it('mirrors writes to the sandbox provider when one is supplied', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://x.example.com',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([
				{
					path: 'src/app/page.tsx',
					content: 'export default function Page() { return <div>hi</div> }',
				},
				{ path: 'src/lib/util.ts', content: 'export function util() { return 1 }' },
			])

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			expect(writeFiles).toHaveBeenCalledTimes(1)
			const callArg = writeFiles.mock.calls[0][0]
			expect(callArg.files).toHaveLength(2)
		})

		it('emits sandbox_ready exactly once and persists the preview URL to storage', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview-abc',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([
				{ path: 'src/a.ts', content: 'a' },
				{ path: 'src/b.ts', content: 'b' },
				{ path: 'src/c.ts', content: 'c' },
			])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			const sandboxReadyEvents = events.filter((e) => e.type === 'sandbox_ready')
			expect(sandboxReadyEvents).toHaveLength(1)
			const sandboxReady = sandboxReadyEvents[0]
			if (sandboxReady?.type !== 'sandbox_ready') throw new Error('expected sandbox_ready')
			expect(sandboxReady.previewUrl).toBe('https://sandbox.example.com/preview-abc')

			const project = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			expect(project.previewUrl).toBe('https://sandbox.example.com/preview-abc')
			expect(project.previewUrlUpdatedAt).not.toBeNull()
		})

		it('does not emit sandbox_ready when no sandbox provider is configured', async () => {
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])
			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)
			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(false)
		})
	})

	describe('failures', () => {
		it('emits failed when Sonnet returns no tool_use blocks', async () => {
			const { client: anthropic } = makeTextOnlyMock('I cannot help with that request.')
			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'do something',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.reason).toContain('no file writes')
			}
		})

		it('does NOT flip HEAD when the build fails', async () => {
			const { client: anthropic } = makeTextOnlyMock('nope')
			const project0 = await fixture.storage.getProject(fixture.projectId, fixture.userId)

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const project1 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			expect(project1.currentBuildId).toBe(project0.currentBuildId)
		})

		it('emits failed when token ledger is exhausted', async () => {
			await fixture.ledger.tryDebit(fixture.userId, 200)

			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'x' }])
			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.code).toBe('ceiling_exhausted')
			}
		})

		it('rejects pre-flight when remaining budget is below the estimate (no Sonnet call)', async () => {
			// One Sonnet build estimates at ~118 cents (100k input + 64k output
			// at $3/$15 per Mtok × 0.93 EUR/USD). With 100 cents remaining the
			// user CANNOT afford this build, but the original `< 1` pre-check
			// would let it through and we'd burn the Anthropic call before
			// debiting and rejecting post-hoc. Verify (a) we fail with
			// ceiling_exhausted and (b) the Anthropic mock was NEVER called.
			await fixture.ledger.tryDebit(fixture.userId, 100) // 100 remaining of 200

			// The handler should never run — the pre-flight ceiling check must
			// reject the build BEFORE any Sonnet call. If the handler runs we
			// fail the test loudly so the failure points at the regression
			// instead of at a missing/partial response shape.
			const { client: anthropic, mock: messagesCreate } = makeAnthropicMock(async () => {
				throw new Error('Sonnet should not have been called: pre-flight ceiling check failed')
			})

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'do a thing',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.code).toBe('ceiling_exhausted')
			}
			expect(messagesCreate).not.toHaveBeenCalled()
		})

		it('rejects unsafe paths from Sonnet output', async () => {
			const { client: anthropic } = makeToolUseMock([{ path: '../etc/passwd', content: 'pwned' }])
			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
		})

		it('rejects malformed tool_use input that fails Zod validation', async () => {
			const { client: anthropic } = makeAnthropicMock(async () => ({
				id: 'msg',
				type: 'message',
				role: 'assistant',
				model: 'claude-sonnet-4-6',
				stop_reason: 'end_turn',
				stop_sequence: null,
				container: null,
				content: [
					{
						type: 'tool_use',
						id: 't',
						name: 'write_file',
						// Bad shape — Zod at the orchestrator boundary should reject.
						input: { path: 123 } as Record<string, unknown>,
						caller: { type: 'direct' },
					},
				],
				usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: 50 },
			}))

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)
			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.reason).toContain('Zod')
			}
		})

		it('emits failed when project does not belong to the user', async () => {
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'x' }])
			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: 'someone_else',
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)
			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
		})

		it('aborts the Sonnet call when the request signal fires', async () => {
			// The route hands its `request.signal` down so a client disconnect
			// (or a route-level cancel) can short-circuit the in-flight build.
			// The Anthropic SDK accepts the signal via its second `RequestOptions`
			// argument; we verify the orchestrator threads it through.
			const ctrl = new AbortController()
			ctrl.abort()

			const { client: anthropic } = makeAnthropicMock(async (_body, opts) => {
				if (opts?.signal?.aborted) {
					const err = new Error('Request was aborted.')
					err.name = 'AbortError'
					throw err
				}
				return {
					id: 'msg',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-6',
					stop_reason: 'end_turn',
					stop_sequence: null,
					container: null,
					content: [],
					usage: { ...EMPTY_USAGE },
				}
			})

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
						signal: ctrl.signal,
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.code).toBe('aborted')
			}

			const started = events.find((e) => e.type === 'started')
			if (started?.type !== 'started') throw new Error('expected started')
			const build = await fixture.storage.getBuild(fixture.projectId, started.buildId)
			expect(build.status).toBe('failed')
		})

		it('rejects responses truncated by max_tokens (data loss guard)', async () => {
			// A truncated tool_use input is a partial file body; committing it would overwrite good content with garbage.
			const { client: anthropic } = makeAnthropicMock(async () => ({
				id: 'msg_test',
				type: 'message',
				role: 'assistant',
				model: 'claude-sonnet-4-6',
				stop_reason: 'max_tokens',
				stop_sequence: null,
				container: null,
				content: [
					{
						type: 'tool_use' as const,
						id: 'tool_0',
						name: 'write_file',
						input: { path: 'src/app/page.tsx', content: 'export default funct' } as Record<
							string,
							unknown
						>,
						caller: { type: 'direct' },
					},
				],
				usage: { ...EMPTY_USAGE, input_tokens: 100, output_tokens: MAX_OUTPUT_TOKENS_PER_BUILD },
			}))

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'do a big thing',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const failed = events[events.length - 1]
			expect(failed.type).toBe('failed')
			if (failed.type === 'failed') {
				expect(failed.code).toBe('max_tokens_truncated')
			}

			const project = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			const head = project.currentBuildId
			if (!head) throw new Error('expected a HEAD')
			const headBuild = await fixture.storage.getBuild(fixture.projectId, head)
			expect(headBuild.triggeredBy).toBe('template') // genesis, not user_prompt
		})

		it('marks the streaming build as failed (does not leave it orphaned)', async () => {
			const { client: anthropic } = makeTextOnlyMock('I cannot help with that.')
			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'do something',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const started = events.find((e) => e.type === 'started')
			if (started?.type !== 'started') throw new Error('expected a started event')

			const build = await fixture.storage.getBuild(fixture.projectId, started.buildId)
			expect(build.status).toBe('failed')
		})
	})

	describe('sandbox_ready post-commit invariants', () => {
		it('emits sandbox_ready AFTER committed', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([
				{ path: 'src/a.ts', content: 'a' },
				{ path: 'src/b.ts', content: 'b' },
			])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			const types = events.map((e) => e.type)
			const committedIdx = types.indexOf('committed')
			const readyIdx = types.indexOf('sandbox_ready')
			expect(committedIdx).toBeGreaterThanOrEqual(0)
			expect(readyIdx).toBeGreaterThan(committedIdx)
		})

		it('does not advertise sandbox_ready when commit fails', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })

			const project0 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			const previewBefore = project0.previewUrl

			const realBeginBuild = fixture.storage.beginBuild.bind(fixture.storage)
			const beginBuildSpy = vi
				.spyOn(fixture.storage, 'beginBuild')
				.mockImplementation(async (opts) => {
					const ctx = await realBeginBuild(opts)
					ctx.commit = async () => {
						throw new Error('forced commit failure for atomicity test')
					}
					return ctx
				})

			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			beginBuildSpy.mockRestore()

			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(false)
			expect(events.some((e) => e.type === 'committed')).toBe(false)
			expect(writeFiles).not.toHaveBeenCalled()

			const project1 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			expect(project1.previewUrl).toBe(previewBefore)
		})

		it('drops sandbox_ready when sandbox returns a non-http(s) previewUrl', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'javascript:alert(1)',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const project0 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			const previewBefore = project0.previewUrl

			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(false)
			expect(events.some((e) => e.type === 'committed')).toBe(true)
			const project1 = await fixture.storage.getProject(fixture.projectId, fixture.userId)
			expect(project1.previewUrl).toBe(previewBefore)
		})

		it('emits one sandbox_ready per batched call', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([
				{ path: 'src/a.ts', content: 'a' },
				{ path: 'src/b.ts', content: 'b' },
				{ path: 'src/c.ts', content: 'c' },
			])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			expect(writeFiles).toHaveBeenCalledTimes(1)
			const sandboxReady = events.find((e) => e.type === 'sandbox_ready')
			if (sandboxReady?.type !== 'sandbox_ready') throw new Error('expected sandbox_ready event')
			expect(sandboxReady.previewUrl).toBe('https://sandbox.example.com/preview')
		})

		it('still emits sandbox_ready when setPreviewUrl cache write fails', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const setPreviewUrlSpy = vi
				.spyOn(fixture.storage, 'setPreviewUrl')
				.mockRejectedValue(new Error('forced cache write failure'))
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox, ledger: fixture.ledger, anthropic },
				),
			)

			expect(events.some((e) => e.type === 'committed')).toBe(true)
			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(true)
			expect(consoleErrorSpy).toHaveBeenCalled()

			setPreviewUrlSpy.mockRestore()
			consoleErrorSpy.mockRestore()
		})

		it('does not emit sandbox_ready or call setPreviewUrl when deps.sandbox is null', async () => {
			const setPreviewUrlSpy = vi.spyOn(fixture.storage, 'setPreviewUrl')
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			expect(events.some((e) => e.type === 'committed')).toBe(true)
			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(false)
			expect(setPreviewUrlSpy).not.toHaveBeenCalled()
			setPreviewUrlSpy.mockRestore()
		})
	})

	describe('self-repair after validation failure', () => {
		it('sends tool_result blocks matching every prior tool_use in the repair call', async () => {
			let callIndex = 0
			const firstToolUseIds = ['toolu_01aaaa', 'toolu_02bbbb']

			const { client: anthropic, mock } = makeAnthropicMock(async () => {
				callIndex++
				if (callIndex === 1) {
					// First call: return two tool_uses, one of which imports a
					// denied package (`next/dynamic`). validateBuildFiles will fail.
					return {
						id: 'msg_initial',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-6',
						stop_reason: 'end_turn',
						stop_sequence: null,
						container: null,
						content: [
							{
								type: 'tool_use',
								id: firstToolUseIds[0],
								name: 'write_file',
								input: {
									path: 'src/app/page.tsx',
									content:
										"import dynamic from 'next/dynamic'\nexport default function Page() { return <div /> }",
								},
								caller: { type: 'direct' },
							},
							{
								type: 'tool_use',
								id: firstToolUseIds[1],
								name: 'write_file',
								input: {
									path: 'src/components/Clean.tsx',
									content: 'export function Clean() { return <span /> }',
								},
								caller: { type: 'direct' },
							},
						],
						usage: { ...EMPTY_USAGE, input_tokens: 1000, output_tokens: 500 },
					}
				}
				// Repair call: return a fixed file and "end" the build.
				return {
					id: 'msg_repair',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-6',
					stop_reason: 'end_turn',
					stop_sequence: null,
					container: null,
					content: [
						{
							type: 'tool_use',
							id: 'toolu_repair',
							name: 'write_file',
							input: {
								path: 'src/app/page.tsx',
								content: 'export default function Page() { return <div /> }',
							},
							caller: { type: 'direct' },
						},
					],
					usage: { ...EMPTY_USAGE, input_tokens: 500, output_tokens: 200 },
				}
			})

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			// Confirm we actually hit the repair path.
			expect(mock.mock.calls.length).toBeGreaterThanOrEqual(2)
			const repairBody = mock.mock.calls[1][0] as {
				messages: Array<{ role: string; content: unknown }>
			}

			// The second-to-last message must be the prior assistant message
			// (the one with the problematic tool_uses).
			const assistantMsg = repairBody.messages[1]
			expect(assistantMsg.role).toBe('assistant')
			const assistantBlocks = assistantMsg.content as Array<{ type: string; id?: string }>
			const toolUseIdsInAssistant = assistantBlocks
				.filter((b) => b.type === 'tool_use')
				.map((b) => b.id)
			expect(toolUseIdsInAssistant).toEqual(firstToolUseIds)

			// The follow-up user message must START with tool_result blocks
			// whose tool_use_ids match every tool_use in the assistant message.
			const followUp = repairBody.messages[2]
			expect(followUp.role).toBe('user')
			const followUpContent = followUp.content as Array<{
				type: string
				tool_use_id?: string
			}>
			const leadingToolResultIds: string[] = []
			for (const block of followUpContent) {
				if (block.type !== 'tool_result') break
				if (block.tool_use_id) leadingToolResultIds.push(block.tool_use_id)
			}
			expect(leadingToolResultIds).toEqual(firstToolUseIds)

			// And after the tool_results, the validation-error text must still be present.
			const textBlock = followUpContent.find(
				(b): b is { type: string; tool_use_id?: string; text?: string } & { text: string } =>
					b.type === 'text' && typeof (b as { text?: string }).text === 'string',
			)
			expect(textBlock).toBeDefined()
		})

		it('marks only the failing tool_use with is_error; clean files get content: "ok"', async () => {
			let callIndex = 0
			const badId = 'toolu_bad'
			const goodId = 'toolu_good'

			const { client: anthropic, mock } = makeAnthropicMock(async () => {
				callIndex++
				if (callIndex === 1) {
					return {
						id: 'msg_initial',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-6',
						stop_reason: 'end_turn',
						stop_sequence: null,
						container: null,
						content: [
							{
								type: 'tool_use',
								id: badId,
								name: 'write_file',
								input: {
									path: 'src/app/page.tsx',
									content: "import dynamic from 'next/dynamic'\nexport default function P() {}",
								},
								caller: { type: 'direct' },
							},
							{
								type: 'tool_use',
								id: goodId,
								name: 'write_file',
								input: {
									path: 'src/components/Clean.tsx',
									content: 'export function Clean() { return <span /> }',
								},
								caller: { type: 'direct' },
							},
						],
						usage: { ...EMPTY_USAGE, input_tokens: 1000, output_tokens: 500 },
					}
				}
				return {
					id: 'msg_repair',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-6',
					stop_reason: 'end_turn',
					stop_sequence: null,
					container: null,
					content: [
						{
							type: 'tool_use',
							id: 'toolu_fix',
							name: 'write_file',
							input: {
								path: 'src/app/page.tsx',
								content: 'export default function P() { return <div /> }',
							},
							caller: { type: 'direct' },
						},
					],
					usage: { ...EMPTY_USAGE, input_tokens: 300, output_tokens: 200 },
				}
			})

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)

			const repairBody = mock.mock.calls[1][0] as {
				messages: Array<{ role: string; content: unknown }>
			}
			const followUpContent = repairBody.messages[2].content as Array<{
				type: string
				tool_use_id?: string
				content?: string
				is_error?: boolean
			}>
			const badResult = followUpContent.find((b) => b.tool_use_id === badId)
			const goodResult = followUpContent.find((b) => b.tool_use_id === goodId)
			expect(badResult?.is_error).toBe(true)
			expect(badResult?.content).toMatch(/dynamic|disallowed|denied|import/i)
			expect(goodResult?.is_error).toBeFalsy()
			expect(goodResult?.content).toBe('ok')
		})

		it('fails explicitly with repair_truncated when repair hits max_tokens', async () => {
			let callIndex = 0
			const { client: anthropic } = makeAnthropicMock(async () => {
				callIndex++
				if (callIndex === 1) {
					return {
						id: 'msg_initial',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-6',
						stop_reason: 'end_turn',
						stop_sequence: null,
						container: null,
						content: [
							{
								type: 'tool_use',
								id: 'toolu_bad',
								name: 'write_file',
								input: {
									path: 'src/app/page.tsx',
									content: "import dynamic from 'next/dynamic'\nexport default function P() {}",
								},
								caller: { type: 'direct' },
							},
						],
						usage: { ...EMPTY_USAGE, input_tokens: 800, output_tokens: 200 },
					}
				}
				// Repair truncated mid-output.
				return {
					id: 'msg_repair_truncated',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-6',
					stop_reason: 'max_tokens',
					stop_sequence: null,
					container: null,
					content: [],
					usage: { ...EMPTY_USAGE, input_tokens: 500, output_tokens: 2048 },
				}
			})

			const events = await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{ storage: fixture.storage, sandbox: null, ledger: fixture.ledger, anthropic },
				),
			)
			const failed = events.find((e) => e.type === 'failed')
			expect(failed).toBeDefined()
			if (failed?.type === 'failed') {
				expect(failed.code).toBe('repair_truncated')
			}
		})

		it('emits separate ai_call_log rows for build and build_repair', async () => {
			let callIndex = 0
			const { client: anthropic } = makeAnthropicMock(async () => {
				callIndex++
				if (callIndex === 1) {
					return {
						id: 'msg_initial',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-6',
						stop_reason: 'end_turn',
						stop_sequence: null,
						container: null,
						content: [
							{
								type: 'tool_use',
								id: 'toolu_bad',
								name: 'write_file',
								input: {
									path: 'src/app/page.tsx',
									content: "import dynamic from 'next/dynamic'\nexport default function P() {}",
								},
								caller: { type: 'direct' },
							},
						],
						usage: { ...EMPTY_USAGE, input_tokens: 1000, output_tokens: 500 },
					}
				}
				return {
					id: 'msg_repair',
					type: 'message',
					role: 'assistant',
					model: 'claude-sonnet-4-6',
					stop_reason: 'end_turn',
					stop_sequence: null,
					container: null,
					content: [
						{
							type: 'tool_use',
							id: 'toolu_fix',
							name: 'write_file',
							input: {
								path: 'src/app/page.tsx',
								content: 'export default function P() { return <div /> }',
							},
							caller: { type: 'direct' },
						},
					],
					usage: { ...EMPTY_USAGE, input_tokens: 300, output_tokens: 200 },
				}
			})

			const loggerSpy = vi.fn()

			await collectEvents(
				orchestrateBuild(
					{
						projectId: fixture.projectId,
						userId: fixture.userId,
						prompt: 'p',
					},
					{
						storage: fixture.storage,
						sandbox: null,
						ledger: fixture.ledger,
						anthropic,
						aiCallLogger: loggerSpy,
					},
				),
			)

			const kinds = loggerSpy.mock.calls.map((c: unknown[]) => (c[0] as { kind: string }).kind)
			expect(kinds).toContain('build')
			expect(kinds).toContain('build_repair')
			// The repair row must NOT carry the initial call's output_tokens (500).
			// The initial row carries 500; the repair row carries 200.
			const repairRow = loggerSpy.mock.calls
				.map((c: unknown[]) => c[0] as { kind: string; outputTokens: number })
				.find((r) => r.kind === 'build_repair')
			expect(repairRow?.outputTokens).toBe(200)
		})
	})

	describe('preview probe', () => {
		it('records preview probe data after sandbox_ready with the served URL', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview-xyz',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const previewProbeFetch = vi
				.fn()
				.mockResolvedValue({ status: 200, text: async () => '<html>hello</html>' })

			const probeCalls: { buildId: string; status: number; bodyLength: number }[] = []
			const realBeginBuild = fixture.storage.beginBuild.bind(fixture.storage)
			const beginBuildSpy = vi
				.spyOn(fixture.storage, 'beginBuild')
				.mockImplementation(async (opts) => {
					const ctx = await realBeginBuild(opts)
					const realRecord = ctx.recordPreviewProbe.bind(ctx)
					ctx.recordPreviewProbe = async (probe) => {
						probeCalls.push({
							buildId: ctx.buildId,
							status: probe.status,
							bodyLength: probe.bodyLength,
						})
						await realRecord(probe)
					}
					return ctx
				})

			await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{
						storage: fixture.storage,
						sandbox,
						ledger: fixture.ledger,
						anthropic,
						previewProbeFetch,
					},
				),
			)

			beginBuildSpy.mockRestore()

			expect(previewProbeFetch).toHaveBeenCalledTimes(1)
			expect(previewProbeFetch.mock.calls[0][0]).toBe('https://sandbox.example.com/preview-xyz')

			expect(probeCalls).toHaveLength(1)
			expect(probeCalls[0].status).toBe(200)
			expect(probeCalls[0].bodyLength).toBe('<html>hello</html>'.length)
		})

		it('still records probe when status is non-2xx', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const previewProbeFetch = vi
				.fn()
				.mockResolvedValue({ status: 503, text: async () => 'Service Unavailable' })

			const probeCalls: { status: number; bodyLength: number; bodyPreview: string }[] = []
			const realBeginBuild = fixture.storage.beginBuild.bind(fixture.storage)
			const beginBuildSpy = vi
				.spyOn(fixture.storage, 'beginBuild')
				.mockImplementation(async (opts) => {
					const ctx = await realBeginBuild(opts)
					const realRecord = ctx.recordPreviewProbe.bind(ctx)
					ctx.recordPreviewProbe = async (probe) => {
						probeCalls.push({
							status: probe.status,
							bodyLength: probe.bodyLength,
							bodyPreview: probe.bodyPreview,
						})
						await realRecord(probe)
					}
					return ctx
				})

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{
						storage: fixture.storage,
						sandbox,
						ledger: fixture.ledger,
						anthropic,
						previewProbeFetch,
					},
				),
			)

			beginBuildSpy.mockRestore()

			expect(events.some((e) => e.type === 'committed')).toBe(true)
			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(true)
			expect(probeCalls).toHaveLength(1)
			expect(probeCalls[0].status).toBe(503)
			expect(probeCalls[0].bodyPreview).toBe('Service Unavailable')
		})

		it('does not run probe when no sandbox is configured', async () => {
			const previewProbeFetch = vi.fn()
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{
						storage: fixture.storage,
						sandbox: null,
						ledger: fixture.ledger,
						anthropic,
						previewProbeFetch,
					},
				),
			)

			expect(previewProbeFetch).not.toHaveBeenCalled()
		})

		it('does not fail the build when recordPreviewProbe throws', async () => {
			const writeFiles = vi.fn().mockResolvedValue({
				projectId: fixture.projectId,
				previewUrl: 'https://sandbox.example.com/preview',
				status: 'ready',
			})
			const sandbox = makeStubSandbox({ writeFiles })
			const { client: anthropic } = makeToolUseMock([{ path: 'src/a.ts', content: 'a' }])

			const previewProbeFetch = vi.fn().mockResolvedValue({ status: 200, text: async () => 'ok' })
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const realBeginBuild = fixture.storage.beginBuild.bind(fixture.storage)
			const beginBuildSpy = vi
				.spyOn(fixture.storage, 'beginBuild')
				.mockImplementation(async (opts) => {
					const ctx = await realBeginBuild(opts)
					ctx.recordPreviewProbe = async () => {
						throw new Error('forced storage failure')
					}
					return ctx
				})

			const events = await collectEvents(
				orchestrateBuild(
					{ projectId: fixture.projectId, userId: fixture.userId, prompt: 'p' },
					{
						storage: fixture.storage,
						sandbox,
						ledger: fixture.ledger,
						anthropic,
						previewProbeFetch,
					},
				),
			)

			beginBuildSpy.mockRestore()
			consoleWarnSpy.mockRestore()

			expect(events.some((e) => e.type === 'committed')).toBe(true)
			expect(events.some((e) => e.type === 'sandbox_ready')).toBe(true)
			expect(events.some((e) => e.type === 'failed')).toBe(false)
		})
	})
})
