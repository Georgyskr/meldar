/**
 * Orchestrator v1 — the kanban card → Sonnet → streamed Build loop.
 *
 * This is the heart of Meldar v3. The flow:
 *
 *   1. Pre-flight: validate input, fetch project + current files, estimate
 *      cost, debit token ledger
 *   2. Begin a streaming Build via ProjectStorage
 *   3. Call Sonnet with the project context + user prompt + write_file tool
 *   4. Parse each tool_use in the response, validate the file output
 *      against the Zod schema (AGENTS.md hard rule), write each file via
 *      BuildContext, mirror to the live sandbox via SandboxProvider
 *   5. On success: commit the build with the actual token cost; on failure:
 *      mark the build as failed and emit an error event
 *
 * Returns an AsyncGenerator<OrchestratorEvent>. The API route adapts the
 * generator to a Server-Sent Events stream the workspace UI consumes.
 *
 * Sprint 1 deliberately uses NON-STREAMING Sonnet calls (no incremental
 * tool_use parsing). This is simpler and lets the orchestrator emit
 * file_written events synchronously per tool_use after the response lands.
 * Streaming the partial JSON is a polish item — see Phase 2 backlog.
 */

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

/**
 * Zod schema for the write_file tool's input. Validates EVERY tool_use payload
 * before any storage write happens. This is the AGENTS.md "Validate ALL AI
 * Output" rule applied at the orchestrator boundary.
 */
const writeFileInputSchema = z.object({
	path: z.string().min(1).max(512),
	content: z.string().max(10 * 1024 * 1024),
})

/**
 * A typed orchestrator failure with a stable machine-readable `code`.
 *
 * Throwing this from inside the orchestrate loop lets the catch block surface
 * a meaningful `code` on the `failed` SSE event instead of falling back to
 * the generic `err.constructor.name` (which would be 'Error' for everything).
 */
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

/**
 * Run a Build. Yields {@link OrchestratorEvent}s as it progresses.
 *
 * Catch any error inside the generator body so we always emit a `failed`
 * event before propagating — the SSE consumer relies on every stream
 * terminating with either `committed` or `failed`.
 */
export async function* orchestrateBuild(
	request: OrchestrateBuildRequest,
	deps: OrchestratorDeps,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const model = request.model ?? MODELS.SONNET
	let buildId: string | undefined
	// Held in outer scope so the catch block can fail() the original build
	// instead of orphaning it. (Sprint 1 had a bug where the catch began a
	// SECOND build and discarded the handle, leaving the first row stuck in
	// 'streaming' forever.)
	let buildContext: BuildContext | undefined

	try {
		// ── Pre-flight ────────────────────────────────────────────────────
		// Estimate cost conservatively (worst-case max input + max output)
		// and reject the build if the user can't afford it. Without this
		// check a user with 50¢ remaining could kick off a 118¢-estimated
		// build, burn the Anthropic call, and only THEN get rejected at
		// debit-time — wasted spend on us. The post-call ledger debit is
		// still the source of truth, but the pre-flight saves the obviously
		// unaffordable case.
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

		// ── Project context ───────────────────────────────────────────────
		// Verify ownership + load the live working set. The orchestrator
		// always runs with project ownership context — never trust the
		// client to assert it.
		await deps.storage.getProject(request.projectId, request.userId)
		const currentFiles = await deps.storage.getCurrentFiles(request.projectId)

		// Fetch contents for prompt context. For Sprint 1 we send EVERY
		// current file. Later we'll trim by relevance using a cheap Haiku
		// pre-pass — but small projects (under ~50 files) are fine.
		const projectFiles: { path: string; content: string }[] = []
		for (const f of currentFiles) {
			const content = await deps.storage.readFile(request.projectId, f.path)
			projectFiles.push({ path: f.path, content })
		}

		// ── Begin Build ───────────────────────────────────────────────────
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

		// ── Sonnet call ───────────────────────────────────────────────────
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
			// Pass the caller's abort signal so a client disconnect cancels
			// the in-flight Sonnet call instead of letting it run to completion.
			request.signal ? { signal: request.signal } : undefined,
		)

		// ── Truncation guard ──────────────────────────────────────────────
		// Sonnet hit max_tokens (or any non-natural stop) means the LAST
		// tool_use input may be a partial JSON value — i.e. a half-written
		// file body. Treating that as a whole-file overwrite would silently
		// destroy the previous version. Refuse to commit anything.
		if (response.stop_reason !== 'end_turn' && response.stop_reason !== 'tool_use') {
			throw new OrchestratorBuildError(
				`Sonnet stopped with stop_reason='${response.stop_reason}'; refusing to commit a possibly-truncated build`,
				response.stop_reason === 'max_tokens'
					? 'max_tokens_truncated'
					: `stopped_${response.stop_reason}`,
			)
		}

		// ── Process tool_use blocks ───────────────────────────────────────
		// Sonnet may produce text blocks alongside tool_use blocks. We
		// IGNORE text — the system prompt instructs tool-only output, and
		// any incidental text is not part of the build. Validation lives in
		// `writeFileInputSchema`; anything that fails validation throws and
		// the catch below marks the build as failed.
		const toolUses = response.content.filter(
			(block): block is Anthropic.Messages.ToolUseBlock =>
				block.type === 'tool_use' && block.name === WRITE_FILE_TOOL.name,
		)

		if (toolUses.length === 0) {
			// Sonnet returned text only — likely a refusal or a safety stop.
			// Mark failed and bubble up the text content for debugging.
			const textPreview = response.content
				.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
				.map((b) => b.text)
				.join('\n')
				.slice(0, 500)
			throw new Error(`Sonnet returned no file writes. Response text: ${textPreview || '<empty>'}`)
		}

		let fileIndex = 0
		for (const toolUse of toolUses) {
			const parsed = writeFileInputSchema.safeParse(toolUse.input)
			if (!parsed.success) {
				throw new Error(`tool_use input failed Zod validation: ${parsed.error.message}`)
			}
			const file = parsed.data

			// 1. Persist to storage (upserts project_files + inserts build_files
			//    + content-addressed blob put). This is the source of truth.
			await buildContext.writeFile(file)

			// 2. Mirror to the live sandbox so the iframe HMRs to the new
			//    state. If sandbox is unavailable (dev mode without a worker
			//    deployment), skip — the storage write is what matters for
			//    correctness.
			if (deps.sandbox) {
				await deps.sandbox.writeFiles({
					projectId: request.projectId,
					files: [file],
				})
			}

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

		// ── Cost accounting ───────────────────────────────────────────────
		// Compute the ACTUAL cents cost from response.usage. The estimate
		// from above was conservative; the actual is what we charge.
		const actualCents = tokensToCents(
			model,
			response.usage.input_tokens,
			response.usage.output_tokens,
		)
		const totalTokens = response.usage.input_tokens + response.usage.output_tokens

		// Debit the ledger AFTER the build but BEFORE the commit. If the
		// debit fails (ceiling exceeded), the build is marked failed but
		// the file writes already happened — that's OK because we don't
		// flip current_build_id until commit(). The user gets the error
		// event and the previous HEAD is intact.
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

		// ── Commit ────────────────────────────────────────────────────────
		const committed = await buildContext.commit({ tokenCost: totalTokens })

		yield {
			type: 'committed',
			buildId: committed.id,
			tokenCost: totalTokens,
			actualCents,
			fileCount: fileIndex,
		}
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err)
		// Prefer a typed orchestrator code if the error carries one; map a
		// DOMException/AbortError to a stable 'aborted' code so the SSE
		// consumer can distinguish a client cancel from a real failure;
		// otherwise fall back to the constructor name (debug-only).
		// AbortError is what the Web fetch abort + the Anthropic SDK both throw
		// when the signal fires; APIUserAbortError is the SDK's own typed flavor.
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

		// Best-effort: transition the original streaming build to 'failed' so
		// it doesn't pile up in the in-flight index waiting for a reaper that
		// doesn't exist yet. We swallow errors from fail() itself because the
		// user is already going to see the outer 'failed' event below.
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
