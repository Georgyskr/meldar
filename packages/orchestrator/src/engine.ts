import type Anthropic from '@anthropic-ai/sdk'
import type { SandboxProvider } from '@meldar/sandbox'
import type { BuildContext, ProjectStorage } from '@meldar/storage'
import { sha256Hex } from '@meldar/storage'
import { CeilingExceededError, MODELS, type TokenLedger, tokensToCents } from '@meldar/tokens'
import { z } from 'zod'
import { BUILD_SYSTEM_PROMPT, buildUserMessage } from './prompts'
import {
	MAX_INPUT_TOKENS_PER_BUILD,
	MAX_OUTPUT_TOKENS_PER_BUILD,
	type OrchestrateBuildRequest,
	type OrchestratorEvent,
	WRITE_FILE_TOOL,
} from './types'

const writeFileInputSchema = z.object({
	path: z.string().min(1).max(512),
	content: z.string().max(10 * 1024 * 1024),
})

export const previewUrlSchema = z
	.string()
	.url()
	.refine(
		(u) => {
			try {
				return ['https:', 'http:'].includes(new URL(u).protocol)
			} catch {
				return false
			}
		},
		{ message: 'preview URL must use http(s) protocol' },
	)

class OrchestratorBuildError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message)
		this.name = 'OrchestratorBuildError'
	}
}

export type OrchestratorDeps = {
	readonly storage: ProjectStorage
	readonly sandbox: SandboxProvider | null
	readonly ledger: TokenLedger
	readonly anthropic: Anthropic
}

export async function* orchestrateBuild(
	request: OrchestrateBuildRequest,
	deps: OrchestratorDeps,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const model = request.model ?? MODELS.SONNET
	let buildId: string | undefined
	let buildContext: BuildContext | undefined

	try {
		// Pre-flight: reject obviously unaffordable builds before burning the
		// Anthropic call. The post-call ledger debit is still the source of truth.
		const snapshot = await deps.ledger.getSnapshot(request.userId)
		const estimatedCents = tokensToCents(
			model,
			MAX_INPUT_TOKENS_PER_BUILD,
			MAX_OUTPUT_TOKENS_PER_BUILD,
		)
		if (snapshot.remainingCentsToday < estimatedCents) {
			yield {
				type: 'failed',
				reason: `insufficient daily budget for build: have ${snapshot.remainingCentsToday}c remaining, need ~${estimatedCents}c (ceiling ${snapshot.ceilingCentsPerDay}c)`,
				code: 'ceiling_exhausted',
			}
			return
		}

		await deps.storage.getProject(request.projectId, request.userId)
		const currentFiles = await deps.storage.getCurrentFiles(request.projectId)

		const projectFiles = await Promise.all(
			currentFiles.map(async (f) => ({
				path: f.path,
				content: await deps.storage.readFile(request.projectId, f.path),
			})),
		)

		buildContext = await deps.storage.beginBuild({
			projectId: request.projectId,
			triggeredBy: request.kanbanCardId ? 'kanban_card' : 'user_prompt',
			kanbanCardId: request.kanbanCardId,
			modelVersion: model,
			promptHash: await sha256Hex(request.prompt),
		})
		buildId = buildContext.buildId

		yield {
			type: 'started',
			buildId: buildContext.buildId,
			projectId: request.projectId,
		}

		const promptHash = await sha256Hex(request.prompt)
		yield {
			type: 'prompt_sent',
			promptHash,
			estimatedCents,
		}

		const userMessage = buildUserMessage({
			projectFiles,
			userPrompt: request.prompt,
		})

		const response = await deps.anthropic.messages.create(
			{
				model,
				max_tokens: MAX_OUTPUT_TOKENS_PER_BUILD,
				system: BUILD_SYSTEM_PROMPT,
				tools: [WRITE_FILE_TOOL],
				messages: [{ role: 'user', content: userMessage }],
			},
			request.signal ? { signal: request.signal } : undefined,
		)

		// A non-natural stop means the last tool_use input may be partial JSON —
		// committing a truncated file body would silently destroy the previous version.
		if (response.stop_reason !== 'end_turn' && response.stop_reason !== 'tool_use') {
			throw new OrchestratorBuildError(
				`Sonnet stopped with stop_reason='${response.stop_reason}'; refusing to commit a possibly-truncated build`,
				response.stop_reason === 'max_tokens'
					? 'max_tokens_truncated'
					: `stopped_${response.stop_reason}`,
			)
		}

		const toolUses = response.content.filter(
			(block): block is Anthropic.Messages.ToolUseBlock =>
				block.type === 'tool_use' && block.name === WRITE_FILE_TOOL.name,
		)

		if (toolUses.length === 0) {
			const textPreview = response.content
				.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
				.map((b) => b.text)
				.join('\n')
				.slice(0, 500)
			throw new Error(`Sonnet returned no file writes. Response text: ${textPreview || '<empty>'}`)
		}

		const validatedFiles: { path: string; content: string }[] = []
		let fileIndex = 0
		for (const toolUse of toolUses) {
			const parsed = writeFileInputSchema.safeParse(toolUse.input)
			if (!parsed.success) {
				throw new Error(`tool_use input failed Zod validation: ${parsed.error.message}`)
			}
			const file = parsed.data

			await buildContext.writeFile(file)
			validatedFiles.push(file)

			const contentHash = await sha256Hex(file.content)
			yield {
				type: 'file_written',
				path: file.path,
				contentHash,
				sizeBytes: byteLength(file.content),
				fileIndex,
			}
			fileIndex += 1
		}

		const actualCents = tokensToCents(
			model,
			response.usage.input_tokens,
			response.usage.output_tokens,
		)
		const totalTokens = response.usage.input_tokens + response.usage.output_tokens

		// Debit AFTER the build but BEFORE commit: file writes are already done,
		// but HEAD doesn't flip until commit(), so a ceiling-exceeded debit leaves
		// the previous HEAD intact.
		try {
			await deps.ledger.debitOrThrow(request.userId, actualCents)
		} catch (err) {
			if (err instanceof CeilingExceededError) {
				await buildContext.fail('ceiling_exceeded_post_build', { tokenCost: totalTokens })
				yield {
					type: 'failed',
					reason: `daily token ceiling exceeded after build (cost: ${actualCents}c)`,
					buildId,
					code: 'ceiling_exceeded',
				}
				return
			}
			throw err
		}

		const committed = await buildContext.commit({ tokenCost: totalTokens })

		yield {
			type: 'committed',
			buildId: committed.id,
			tokenCost: totalTokens,
			actualCents,
			fileCount: fileIndex,
		}

		// sandbox_ready MUST be yielded after committed: storage HEAD has to flip
		// before we advertise the live sandbox URL.
		if (deps.sandbox && validatedFiles.length > 0) {
			try {
				const sandboxHandle = await deps.sandbox.writeFiles({
					projectId: request.projectId,
					files: validatedFiles,
				})
				if (sandboxHandle.previewUrl) {
					const parsedUrl = previewUrlSchema.safeParse(sandboxHandle.previewUrl)
					if (!parsedUrl.success) {
						console.error(
							'[orchestrator] sandbox returned invalid previewUrl, dropping cache write',
							parsedUrl.error.issues,
						)
					} else {
						await deps.storage.setPreviewUrl(request.projectId, parsedUrl.data).catch((err) => {
							console.error(
								'[orchestrator] setPreviewUrl failed; cache will be stale until next successful build',
								err,
							)
						})
						yield {
							type: 'sandbox_ready',
							previewUrl: parsedUrl.data,
							revision: sandboxHandle.revision,
						}
					}
				}
			} catch (err) {
				console.error('[orchestrator] sandbox writeFiles failed post-commit', err)
			}
		}
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err)
		const isAbort =
			err instanceof Error && (err.name === 'AbortError' || err.name === 'APIUserAbortError')
		const code =
			err instanceof OrchestratorBuildError
				? err.code
				: isAbort
					? 'aborted'
					: err instanceof Error
						? err.constructor.name
						: 'unknown'

		if (buildContext) {
			await buildContext.fail(reason).catch(() => undefined)
		}

		yield {
			type: 'failed',
			reason,
			buildId,
			code,
		}
	}
}

function byteLength(content: string): number {
	return new TextEncoder().encode(content).length
}
