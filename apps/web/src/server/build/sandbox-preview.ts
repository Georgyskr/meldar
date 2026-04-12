import type { OrchestratorEvent } from '@meldar/orchestrator'
import type { SandboxProvider } from '@meldar/sandbox'
import type { ProjectStorage } from '@meldar/storage'

export type SandboxPreviewContext = {
	readonly projectId: string
	readonly userId: string
	readonly storage: ProjectStorage
	readonly sandbox?: SandboxProvider
}

export async function* withSandboxPreview(
	generator: AsyncGenerator<OrchestratorEvent, void, unknown>,
	ctx: SandboxPreviewContext,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	let sawCommitted = false

	for await (const event of generator) {
		yield event
		if (event.type === 'committed') {
			sawCommitted = true
		}
	}

	if (!sawCommitted || !ctx.sandbox) return

	try {
		const rows = await ctx.storage.getCurrentFiles(ctx.projectId)
		const files = await Promise.all(
			rows.map(async (row) => ({
				path: row.path,
				content: await ctx.storage.readFile(ctx.projectId, row.path),
			})),
		)

		const handle = await ctx.sandbox.start({
			projectId: ctx.projectId,
			userId: ctx.userId,
			template: 'next-landing-v1',
			initialFiles: files,
		})

		yield {
			type: 'sandbox_ready',
			previewUrl: handle.previewUrl,
			revision: handle.revision,
		}
	} catch (err) {
		console.warn(
			`[withSandboxPreview] sandbox start failed for project ${ctx.projectId}: ${err instanceof Error ? err.message : String(err)}`,
		)
	}
}
