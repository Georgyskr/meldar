/**
 * Token cost → EUR cents conversion for the AI models Meldar v3 uses.
 *
 * The orchestrator computes spend BEFORE calling debit(), based on the
 * estimated cost of the upcoming AI call. This is an approximation — actual
 * usage may differ from the estimate by ~10% — but the daily ceiling
 * absorbs the slop and the EUR 2/day cap is intentionally conservative.
 *
 * Prices are sourced from Anthropic's pricing page as of 2026-04-06. They
 * change every few quarters; bump this file when they do and the rest of
 * the system picks up the new rate without code changes elsewhere.
 *
 * NOTE: Prices are in USD per 1M tokens. We convert to EUR cents at a
 * fixed 0.93 USD→EUR rate (slightly conservative). For Sprint 1 this is
 * close enough; if exchange rate volatility becomes a real issue we can
 * fetch a daily ECB rate.
 */

import { MODELS, type ModelId } from './models'

const USD_PER_EUR = 0.93 as const

/**
 * USD per million input/output tokens for each model. Update when
 * Anthropic changes pricing.
 */
const MODEL_USD_PRICES_PER_MTOK: Record<ModelId, { input: number; output: number }> = {
	[MODELS.OPUS]: { input: 15, output: 75 },
	[MODELS.SONNET]: { input: 3, output: 15 },
	[MODELS.HAIKU]: { input: 0.8, output: 4 },
}

/**
 * Convert a token usage report to EUR cents (rounded UP to be conservative).
 *
 * Round-up means: even if the actual cost is 0.01 cents, we charge 1 cent.
 * This makes the ledger always lean against the user, which is the right
 * direction for a hard ceiling — we'd rather under-charge in the next call
 * than blow past the cap.
 */
export function tokensToCents(model: ModelId, inputTokens: number, outputTokens: number): number {
	const prices = MODEL_USD_PRICES_PER_MTOK[model]
	if (!prices) {
		throw new Error(`unknown model for pricing: ${model}`)
	}
	const usd = (inputTokens / 1_000_000) * prices.input + (outputTokens / 1_000_000) * prices.output
	const eur = usd * USD_PER_EUR
	const cents = eur * 100
	return Math.max(1, Math.ceil(cents))
}

/**
 * Estimate the cents cost of an AI call given a max-token budget. Used by
 * the orchestrator BEFORE the call to pre-debit conservatively.
 *
 * We assume worst case: full input + full output. The actual debit may be
 * less, but we never refund — over-estimating is the safe direction.
 */
export function estimateMaxCents(
	model: ModelId,
	maxInputTokens: number,
	maxOutputTokens: number,
): number {
	return tokensToCents(model, maxInputTokens, maxOutputTokens)
}
