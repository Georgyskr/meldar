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

	// Skip if orchestrator already provisioned a preview URL via writeFiles.
	// Avoids double sandbox provisioning on subsequent builds.
	try {
		const project = await ctx.storage.getProject(ctx.projectId, ctx.userId).catch(() => null)
		if (project?.previewUrl) return
	} catch {
		// fall through — attempt provision
	}

	try {
		const rows = await ctx.storage.getCurrentFiles(ctx.projectId)
		const files = await Promise.all(
			rows.map(async (row) => ({
				path: row.path,
				content: await ctx.storage.readFile(ctx.projectId, row.path),
			})),
		)

		const startOpts = {
			projectId: ctx.projectId,
			userId: ctx.userId,
			template: 'next-landing-v1',
			initialFiles: files,
		}

		let handle: Awaited<ReturnType<typeof ctx.sandbox.start>>
		try {
			handle = await ctx.sandbox.start(startOpts)
		} catch (firstErr) {
			console.warn(
				`[withSandboxPreview] first attempt failed for ${ctx.projectId}, retrying after prewarm: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
			)
			await ctx.sandbox.prewarm(ctx.projectId)
			handle = await ctx.sandbox.start(startOpts)
		}

		yield {
			type: 'sandbox_ready',
			previewUrl: handle.previewUrl,
			revision: handle.revision,
		}
	} catch (err) {
		console.error(
			`[withSandboxPreview] sandbox failed for project ${ctx.projectId} after retry: ${err instanceof Error ? err.message : String(err)}`,
		)
	}
}
