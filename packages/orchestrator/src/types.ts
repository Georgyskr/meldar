/**
 * Types for the v3 orchestrator — the kanban card → Sonnet → streamed Build
 * loop that's the heart of Meldar's product.
 */

import type { ModelId } from '@meldar/tokens'

/**
 * Input to the orchestrator. Comes from the workspace API route.
 */
export type OrchestrateBuildRequest = {
	readonly projectId: string
	readonly userId: string
	readonly kanbanCardId?: string
	/** The user's natural-language request for what to build/modify. */
	readonly prompt: string
	/** Defaults to Sonnet. Caller can route to Opus for heavier requests. */
	readonly model?: ModelId
	/**
	 * Optional cancellation signal. The route handler passes its `request.signal`
	 * here so a client disconnect (or a route-level cancel) can short-circuit
	 * the in-flight Anthropic call. Without this, a hung Sonnet response holds
	 * the function open until the platform timeout fires.
	 */
	readonly signal?: AbortSignal
}

/**
 * Events emitted by the orchestrator as it progresses through a Build.
 * Consumed by the API route, which adapts them to Server-Sent Events for
 * the workspace UI.
 *
 * The discriminated `type` field is the only stable contract — fields may
 * be added per event type but never removed without bumping the version.
 */
export type OrchestratorEvent =
	| { type: 'started'; buildId: string; projectId: string }
	| { type: 'prompt_sent'; promptHash: string; estimatedCents: number }
	| {
			type: 'file_written'
			path: string
			contentHash: string
			sizeBytes: number
			fileIndex: number
	  }
	| {
			type: 'committed'
			buildId: string
			tokenCost: number
			actualCents: number
			fileCount: number
	  }
	| { type: 'failed'; reason: string; buildId?: string; code?: string }

/**
 * Final result returned by the orchestrator after the AsyncGenerator drains.
 */
export type OrchestratorResult =
	| { ok: true; buildId: string; fileCount: number; tokenCost: number; centsCharged: number }
	| { ok: false; reason: string; code: string; buildId?: string }

/**
 * The Sonnet tool we instruct the model to call. Each invocation = one file
 * write. Sonnet can call this tool many times in a single response.
 */
export const WRITE_FILE_TOOL = {
	name: 'write_file' as const,
	description:
		'Write a file to the project. Path must be relative POSIX (no leading slash, no ".."). ' +
		'Content is the full file body — overwrite, not patch. Call this tool once per file.',
	input_schema: {
		type: 'object' as const,
		properties: {
			path: {
				type: 'string',
				description:
					'Relative POSIX path within the project, e.g. "src/app/page.tsx". No leading slash. No ".." segments. Source files only — never write to node_modules, .next, .git, .env*, dist.',
			},
			content: {
				type: 'string',
				description:
					'The complete file contents as UTF-8 text. This OVERWRITES any existing file at this path — emit the entire file body, not a patch.',
			},
		},
		required: ['path', 'content'],
	},
}

/**
 * Conservative token budget for a single Build. Sonnet tends to allocate ~5-15
 * tokens per generated character. A typical build writes ~30 files of ~50 lines
 * each = ~1500 lines = ~75k characters → ~750k output tokens worst case.
 *
 * We cap output at this number to bound the cost per build at the orchestrator
 * level (independent of the user's daily ceiling). The token ledger is the
 * second line of defense.
 */
export const MAX_OUTPUT_TOKENS_PER_BUILD = 64_000 as const

/**
 * Hint to Sonnet about the maximum input we're willing to send (project
 * context + prompt). The orchestrator builds the input within this budget,
 * truncating older files first if necessary.
 */
export const MAX_INPUT_TOKENS_PER_BUILD = 100_000 as const
