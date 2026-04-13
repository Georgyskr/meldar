import type { OrchestratorEvent } from '@meldar/orchestrator'
import type { SandboxHandle, SandboxProvider } from '@meldar/sandbox'
import type { ProjectStorage } from '@meldar/storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function collectEvents(
	gen: AsyncGenerator<OrchestratorEvent, void, unknown>,
): Promise<OrchestratorEvent[]> {
	const events: OrchestratorEvent[] = []
	for await (const e of gen) {
		events.push(e)
	}
	return events
}

async function* fromArray(
	events: OrchestratorEvent[],
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	for (const e of events) {
		yield e
	}
}

function makeMockStorage(
	files: Array<{ path: string; content: string }> = [
		{ path: 'src/app/page.tsx', content: '<div>hello</div>' },
	],
): ProjectStorage {
	return {
		getCurrentFiles: vi.fn().mockResolvedValue(
			files.map((f) => ({
				projectId: 'proj_1',
				path: f.path,
				contentHash: 'hash',
				sizeBytes: f.content.length,
				r2Key: `r2/${f.path}`,
				version: 1,
			})),
		),
		readFile: vi.fn().mockImplementation((_pid: string, path: string) => {
			const file = files.find((f) => f.path === path)
			return Promise.resolve(file?.content ?? '')
		}),
	} as unknown as ProjectStorage
}

function makeMockSandbox(overrides: Partial<SandboxProvider> = {}): SandboxProvider {
	const defaultHandle: SandboxHandle = {
		projectId: 'proj_1',
		previewUrl: 'https://sandbox-abc.workers.dev',
		status: 'ready',
		revision: 1,
	}
	return {
		prewarm: vi.fn().mockResolvedValue(undefined),
		start: vi.fn().mockResolvedValue(defaultHandle),
		writeFiles: vi.fn().mockResolvedValue(defaultHandle),
		getPreviewUrl: vi.fn().mockResolvedValue(defaultHandle.previewUrl),
		stop: vi.fn().mockResolvedValue(undefined),
		...overrides,
	}
}

describe('withSandboxPreview', () => {
	let withSandboxPreview: typeof import('../sandbox-preview').withSandboxPreview

	beforeEach(async () => {
		vi.resetModules()
		const mod = await import('../sandbox-preview')
		withSandboxPreview = mod.withSandboxPreview
	})

	it('emits sandbox_ready after a committed event', async () => {
		const sandbox = makeMockSandbox()
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeDefined()
		expect(sandboxEvent).toEqual({
			type: 'sandbox_ready',
			previewUrl: 'https://sandbox-abc.workers.dev',
			revision: 1,
		})
	})

	it('passes through all original events unchanged', async () => {
		const sandbox = makeMockSandbox()
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'file_written',
				path: 'src/app/page.tsx',
				contentHash: 'hash',
				sizeBytes: 100,
				fileIndex: 0,
			},
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		const originalTypes = input.map((e) => e.type)
		const outputTypes = events.map((e) => e.type)
		for (const t of originalTypes) {
			expect(outputTypes).toContain(t)
		}
		expect(events[0]).toEqual(input[0])
		expect(events[1]).toEqual(input[1])
		expect(events[2]).toEqual(input[2])
	})

	it('skips sandbox when no sandbox provider is given', async () => {
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
			}),
		)

		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeUndefined()
		expect(events).toHaveLength(2)
	})

	it('logs warning and does not emit sandbox_ready when sandbox.start() throws', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const sandbox = makeMockSandbox({
			start: vi.fn().mockRejectedValue(new Error('container boot failed')),
		})
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeUndefined()
		expect(warnSpy).toHaveBeenCalledOnce()
		expect(warnSpy.mock.calls[0][0]).toContain('container boot failed')
		expect(errorSpy).toHaveBeenCalledOnce()
		expect(errorSpy.mock.calls[0][0]).toContain('container boot failed')
		warnSpy.mockRestore()
		errorSpy.mockRestore()
	})

	it('does not emit sandbox_ready when no committed event is received', async () => {
		const sandbox = makeMockSandbox()
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'failed',
				reason: 'something broke',
				buildId: 'b1',
				code: 'ai_error',
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		expect(sandbox.start).not.toHaveBeenCalled()
		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeUndefined()
	})

	it('passes empty initialFiles when storage returns no files', async () => {
		const sandbox = makeMockSandbox()
		const storage = makeMockStorage([])
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 0,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		expect(sandbox.start).toHaveBeenCalledWith({
			projectId: 'proj_1',
			userId: 'user_1',
			template: 'next-landing-v1',
			initialFiles: [],
		})
		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeDefined()
	})

	it('does not emit sandbox_ready when storage.readFile() throws', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const storage = {
			getCurrentFiles: vi.fn().mockResolvedValue([
				{
					projectId: 'proj_1',
					path: 'src/app/page.tsx',
					contentHash: 'hash',
					sizeBytes: 10,
					r2Key: 'r2/src/app/page.tsx',
					version: 1,
				},
			]),
			readFile: vi.fn().mockRejectedValue(new Error('R2 read failed')),
		} as unknown as ProjectStorage
		const sandbox = makeMockSandbox()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeUndefined()
		const called = warnSpy.mock.calls.length > 0 || errorSpy.mock.calls.length > 0
		expect(called).toBe(true)
		const allMessages = [
			...warnSpy.mock.calls.map((c) => c[0]),
			...errorSpy.mock.calls.map((c) => c[0]),
		].join(' ')
		expect(allMessages).toContain('R2 read failed')
		warnSpy.mockRestore()
		errorSpy.mockRestore()
	})

	it('emits sandbox_ready with undefined previewUrl when handle lacks it', async () => {
		const sandbox = makeMockSandbox({
			start: vi.fn().mockResolvedValue({
				projectId: 'proj_1',
				previewUrl: undefined,
				status: 'ready',
				revision: 1,
			}),
		})
		const storage = makeMockStorage()
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 1,
			},
		]

		const events = await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		const sandboxEvent = events.find((e) => e.type === 'sandbox_ready')
		expect(sandboxEvent).toBeDefined()
		expect(sandboxEvent).toEqual({
			type: 'sandbox_ready',
			previewUrl: undefined,
			revision: 1,
		})
	})

	it('reads files from storage and passes them to sandbox.start()', async () => {
		const files = [
			{ path: 'src/app/page.tsx', content: '<main>Hello</main>' },
			{ path: 'src/app/layout.tsx', content: 'export default function Layout(){}' },
		]
		const sandbox = makeMockSandbox()
		const storage = makeMockStorage(files)
		const input: OrchestratorEvent[] = [
			{ type: 'started', buildId: 'b1', projectId: 'proj_1' },
			{
				type: 'committed',
				buildId: 'b1',
				tokenCost: 5,
				actualCents: 1,
				fileCount: 2,
			},
		]

		await collectEvents(
			withSandboxPreview(fromArray(input), {
				projectId: 'proj_1',
				userId: 'user_1',
				storage,
				sandbox,
			}),
		)

		expect(storage.getCurrentFiles).toHaveBeenCalledWith('proj_1')
		expect(sandbox.start).toHaveBeenCalledWith({
			projectId: 'proj_1',
			userId: 'user_1',
			template: 'next-landing-v1',
			initialFiles: [
				{ path: 'src/app/page.tsx', content: '<main>Hello</main>' },
				{ path: 'src/app/layout.tsx', content: 'export default function Layout(){}' },
			],
		})
	})
})
