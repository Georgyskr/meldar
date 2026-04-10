import type Anthropic from '@anthropic-ai/sdk'
import type { SandboxProvider } from '@meldar/sandbox'
import type { BuildContext, ProjectStorage } from '@meldar/storage'
import { sha256Hex } from '@meldar/storage'
import {
	CeilingExceededError,
	MODELS,
	type TokenLedger,
	tokensToCents,
	usageToCents,
} from '@meldar/tokens'
import { z } from 'zod'
import { BUILD_SYSTEM_PROMPT, buildProjectFilesBlock, buildUserPromptBlock } from './prompts'
import { LOCKED_STARTER_PATHS } from './starter-files'
import {
	MAX_INPUT_TOKENS_PER_BUILD,
	MAX_OUTPUT_TOKENS_PER_BUILD,
	type OrchestrateBuildRequest,
	type OrchestratorEvent,
	WRITE_FILE_TOOL,
} from './types'
import { validateBuildFiles } from './validate-files'

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

export type GlobalSpendGuard = {
	readonly check: () => Promise<
		| { allowed: true; spentToday: number; ceiling: number }
		| {
				allowed: false
				reason: 'paused' | 'ceiling_exceeded'
				spentToday: number
				ceiling: number
		  }
	>
	readonly record: (cents: number) => Promise<void>
}

export type AiCallLogger = (args: {
	userId: string
	projectId: string
	kind: 'build'
	model: string
	inputTokens: number
	cachedReadTokens: number
	cachedWriteTokens: number
	outputTokens: number
	centsCharged: number
	latencyMs: number
	stopReason: string | null
	status: 'ok' | 'error' | 'truncated' | 'aborted' | 'refused'
	errorCode?: string | null
}) => void

export type OrchestratorDeps = {
	readonly storage: ProjectStorage
	readonly sandbox: SandboxProvider | null
	readonly ledger: TokenLedger
	readonly anthropic: Anthropic
	readonly globalSpendGuard?: GlobalSpendGuard
	readonly aiCallLogger?: AiCallLogger
}

export async function* orchestrateBuild(
	request: OrchestrateBuildRequest,
	deps: OrchestratorDeps,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const model = request.model ?? MODELS.SONNET
	let buildId: string | undefined
	let buildContext: BuildContext | undefined

	try {
		if (deps.globalSpendGuard) {
			const guard = await deps.globalSpendGuard.check()
			if (!guard.allowed) {
				yield {
					type: 'failed',
					reason:
						guard.reason === 'paused'
							? 'Meldar is taking a breather. We will be back shortly.'
							: `global daily spend ceiling reached (${guard.spentToday}c of ${guard.ceiling}c)`,
					code: guard.reason === 'paused' ? 'provider_paused' : 'global_ceiling_exhausted',
					kanbanCardId: request.kanbanCardId,
				}
				return
			}
		}

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
				kanbanCardId: request.kanbanCardId,
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
			kanbanCardId: request.kanbanCardId,
		}

		const promptHash = await sha256Hex(request.prompt)
		yield {
			type: 'prompt_sent',
			promptHash,
			estimatedCents,
		}

		const projectFilesBlock = buildProjectFilesBlock(projectFiles)
		const userPromptBlock = buildUserPromptBlock(request.prompt)

		const anthropicStartedAt = Date.now()
		const stream = deps.anthropic.messages.stream(
			{
				model,
				max_tokens: MAX_OUTPUT_TOKENS_PER_BUILD,
				system: [
					{
						type: 'text',
						text: BUILD_SYSTEM_PROMPT,
						cache_control: { type: 'ephemeral' },
					},
				],
				tools: [WRITE_FILE_TOOL],
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: projectFilesBlock,
								cache_control: { type: 'ephemeral' },
							},
							{
								type: 'text',
								text: userPromptBlock,
							},
						],
					},
				],
			},
			request.signal ? { signal: request.signal } : undefined,
		)
		const response = await stream.finalMessage()
		const anthropicLatencyMs = Date.now() - anthropicStartedAt

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

			if (LOCKED_STARTER_PATHS.has(file.path)) {
				continue
			}

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

		if (validatedFiles.length === 0) {
			throw new Error('Sonnet returned no writable file writes (all targeted locked paths)')
		}

		const existingPaths = new Set(currentFiles.map((f) => f.path))
		const validation = validateBuildFiles(validatedFiles, existingPaths)
		if (!validation.ok) {
			const summary = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
			throw new OrchestratorBuildError(`Build validation failed: ${summary}`, 'validation_failed')
		}

		const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0
		const cacheWriteTokens = response.usage.cache_creation_input_tokens ?? 0
		const actualCents = usageToCents(model, {
			inputTokens: response.usage.input_tokens,
			outputTokens: response.usage.output_tokens,
			cacheReadTokens,
			cacheWriteTokens,
		})
		const totalTokens =
			response.usage.input_tokens +
			response.usage.output_tokens +
			cacheReadTokens +
			cacheWriteTokens

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
					kanbanCardId: request.kanbanCardId,
				}
				return
			}
			throw err
		}

		if (deps.globalSpendGuard) {
			await deps.globalSpendGuard.record(actualCents).catch((err) => {
				console.error('[orchestrator] globalSpendGuard.record failed (non-fatal)', err)
			})
		}

		if (deps.aiCallLogger) {
			try {
				deps.aiCallLogger({
					userId: request.userId,
					projectId: request.projectId,
					kind: 'build',
					model,
					inputTokens: response.usage.input_tokens,
					cachedReadTokens: cacheReadTokens,
					cachedWriteTokens: cacheWriteTokens,
					outputTokens: response.usage.output_tokens,
					centsCharged: actualCents,
					latencyMs: anthropicLatencyMs,
					stopReason: response.stop_reason ?? null,
					status: 'ok',
				})
			} catch (err) {
				console.error('[orchestrator] aiCallLogger failed (non-fatal)', err)
			}
		}

		const committed = await buildContext.commit({ tokenCost: totalTokens })

		yield {
			type: 'committed',
			buildId: committed.id,
			tokenCost: totalTokens,
			actualCents,
			fileCount: fileIndex,
			kanbanCardId: request.kanbanCardId,
			cacheReadTokens,
			cacheWriteTokens,
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
			kanbanCardId: request.kanbanCardId,
		}
	}
}

function byteLength(content: string): number {
	return new TextEncoder().encode(content).length
}
