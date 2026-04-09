import { MODELS, type ModelId } from './models'

const USD_PER_EUR = 0.93 as const

const MODEL_USD_PRICES_PER_MTOK: Record<ModelId, { input: number; output: number }> = {
	[MODELS.OPUS]: { input: 15, output: 75 },
	[MODELS.SONNET]: { input: 3, output: 15 },
	[MODELS.HAIKU]: { input: 0.8, output: 4 },
}

const CACHE_WRITE_MULTIPLIER = 1.25 as const
const CACHE_READ_MULTIPLIER = 0.1 as const

export type TokenUsage = {
	readonly inputTokens: number
	readonly outputTokens: number
	readonly cacheReadTokens?: number
	readonly cacheWriteTokens?: number
}

export function tokensToCents(model: ModelId, inputTokens: number, outputTokens: number): number {
	return usageToCents(model, { inputTokens, outputTokens })
}

export function usageToCents(model: ModelId, usage: TokenUsage): number {
	const prices = MODEL_USD_PRICES_PER_MTOK[model]
	if (!prices) {
		throw new Error(`unknown model for pricing: ${model}`)
	}
	const cacheRead = usage.cacheReadTokens ?? 0
	const cacheWrite = usage.cacheWriteTokens ?? 0
	const usd =
		(usage.inputTokens / 1_000_000) * prices.input +
		(usage.outputTokens / 1_000_000) * prices.output +
		(cacheRead / 1_000_000) * prices.input * CACHE_READ_MULTIPLIER +
		(cacheWrite / 1_000_000) * prices.input * CACHE_WRITE_MULTIPLIER
	const eur = usd * USD_PER_EUR
	const cents = eur * 100
	return Math.max(1, Math.ceil(cents))
}

export function estimateMaxCents(
	model: ModelId,
	maxInputTokens: number,
	maxOutputTokens: number,
): number {
	return tokensToCents(model, maxInputTokens, maxOutputTokens)
}
