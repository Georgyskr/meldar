import type { ModelId } from '@meldar/tokens'
import type { ResolvedWishes } from './prompts'

export type OrchestrateBuildRequest = {
	readonly projectId: string
	readonly userId: string
	readonly kanbanCardId?: string
	readonly prompt: string
	readonly model?: ModelId
	readonly signal?: AbortSignal
	readonly wishes?: ResolvedWishes
}

export type OrchestratorEvent =
	| { type: 'started'; buildId: string; projectId: string; kanbanCardId?: string }
	| { type: 'prompt_sent'; promptHash: string; estimatedCents: number }
	| {
			type: 'file_written'
			path: string
			contentHash: string
			sizeBytes: number
			fileIndex: number
	  }
	| { type: 'sandbox_ready'; previewUrl: string }
	| {
			type: 'committed'
			buildId: string
			tokenCost: number
			actualCents: number
			fileCount: number
			kanbanCardId?: string
			cacheReadTokens?: number
			cacheWriteTokens?: number
	  }
	| { type: 'deploying'; slug: string; hostname: string }
	| { type: 'deployed'; url: string; vercelDeploymentId: string; buildDurationMs: number }
	| {
			type: 'deploy_failed'
			reason: string
			code: string
			rejected: boolean
	  }
	| { type: 'failed'; reason: string; buildId?: string; code?: string; kanbanCardId?: string }
	| { type: 'card_started'; cardId: string; cardIndex: number; totalCards: number }
	| { type: 'pipeline_complete'; totalBuilt: number; totalCards: number }
	| { type: 'pipeline_failed'; cardId: string; reason: string }

export type OrchestratorResult =
	| { ok: true; buildId: string; fileCount: number; tokenCost: number; centsCharged: number }
	| { ok: false; reason: string; code: string; buildId?: string }

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

export const MAX_OUTPUT_TOKENS_PER_BUILD = 64_000 as const

export const MAX_INPUT_TOKENS_PER_BUILD = 100_000 as const
