import type Anthropic from '@anthropic-ai/sdk'
import type { AiCallKind, AiCallStatus } from '@meldar/db/schema'
import { type TokenUsage, usageToCents } from '@meldar/tokens'
import { recordAiCall } from './ai-call-log'
import { getAnthropicClient } from './anthropic'
import { checkAllSpendCeilings, recordGlobalSpend, recordUserHourlySpend } from './spend-ceiling'

export type GuardedCallArgs = {
	readonly kind: AiCallKind
	readonly model: string
	readonly userId?: string | null
	readonly projectId?: string | null
	readonly sessionId?: string | null
	readonly params: Anthropic.Messages.MessageCreateParamsNonStreaming
	readonly requestOptions?: Anthropic.RequestOptions
}

export type GuardedCallResult =
	| {
			ok: true
			response: Anthropic.Messages.Message
			inputTokens: number
			outputTokens: number
			cacheReadTokens: number
			cacheWriteTokens: number
			cents: number
	  }
	| {
			ok: false
			reason: 'paused' | 'global_ceiling' | 'user_hourly' | 'user_daily'
			message: string
	  }

/**
 * Single choke point for every Anthropic messages.create call in the app.
 *
 * - Enforces global + per-user spend ceilings (Phase 0.2 + 0.5)
 * - Records actual spend in both ceilings post-call (Phase 0.2)
 * - Writes the call to ai_call_log for audit (Phase 0.3)
 * - Never bypasses the ANTHROPIC_PAUSED kill switch
 *
 * Use this instead of `getAnthropicClient().messages.create(...)` directly.
 * The orchestrator is exempt because it uses a more elaborate guard injected
 * via buildOrchestratorDeps (it needs to record cache metrics from the SDK
 * response and tie the debit to a build context).
 */
export async function guardedAnthropicCall(args: GuardedCallArgs): Promise<GuardedCallResult> {
	const spendCheck = await checkAllSpendCeilings(args.userId ?? 'anon')
	if (!spendCheck.allowed) {
		return {
			ok: false,
			reason: spendCheck.reason,
			message: spendCheck.userMessage,
		}
	}

	const startedAt = Date.now()
	let response: Anthropic.Messages.Message
	try {
		response = await getAnthropicClient().messages.create(args.params, args.requestOptions)
	} catch (err) {
		recordAiCall({
			userId: args.userId ?? null,
			projectId: args.projectId,
			sessionId: args.sessionId,
			kind: args.kind,
			model: args.model,
			inputTokens: 0,
			outputTokens: 0,
			centsCharged: 0,
			latencyMs: Date.now() - startedAt,
			status: 'error',
			errorCode: err instanceof Error ? err.name : 'unknown',
		})
		throw err
	}

	const inputTokens = response.usage?.input_tokens ?? 0
	const outputTokens = response.usage?.output_tokens ?? 0
	const cacheReadTokens =
		(response.usage as { cache_read_input_tokens?: number } | undefined)?.cache_read_input_tokens ??
		0
	const cacheWriteTokens =
		(response.usage as { cache_creation_input_tokens?: number } | undefined)
			?.cache_creation_input_tokens ?? 0

	const usage: TokenUsage = { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
	const cents = usageToCents(args.model as Parameters<typeof usageToCents>[0], usage)

	Promise.all([
		recordGlobalSpend(cents),
		args.userId ? recordUserHourlySpend(args.userId, cents) : Promise.resolve(),
	]).catch((err) => {
		console.error('[guarded-anthropic] spend recording failed:', err)
	})

	const status: AiCallStatus = response.stop_reason === 'max_tokens' ? 'truncated' : 'ok'

	recordAiCall({
		userId: args.userId ?? null,
		projectId: args.projectId,
		sessionId: args.sessionId,
		kind: args.kind,
		model: args.model,
		inputTokens,
		cachedReadTokens: cacheReadTokens,
		cachedWriteTokens: cacheWriteTokens,
		outputTokens,
		centsCharged: cents,
		latencyMs: Date.now() - startedAt,
		stopReason: response.stop_reason ?? null,
		status,
	})

	return {
		ok: true,
		response,
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheWriteTokens,
		cents,
	}
}

export class GuardedCallBlockedError extends Error {
	constructor(
		public readonly reason: 'paused' | 'global_ceiling' | 'user_hourly' | 'user_daily',
		message: string,
	) {
		super(message)
		this.name = 'GuardedCallBlockedError'
	}
}

/**
 * Convenience wrapper that throws on ceiling breach instead of returning a
 * discriminated union. Use inside functions where the caller doesn't care
 * about the distinction and will convert to a 503/fallback at the route layer.
 */
export async function guardedAnthropicCallOrThrow(
	args: GuardedCallArgs,
): Promise<Anthropic.Messages.Message> {
	const result = await guardedAnthropicCall(args)
	if (!result.ok) {
		throw new GuardedCallBlockedError(result.reason, result.message)
	}
	return result.response
}
