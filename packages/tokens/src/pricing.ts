import { MODELS, type ModelId } from './models'

const USD_PER_EUR = 0.93 as const

const MODEL_USD_PRICES_PER_MTOK: Record<ModelId, { input: number; output: number }> = {
	[MODELS.OPUS]: { input: 15, output: 75 },
	[MODELS.SONNET]: { input: 3, output: 15 },
	[MODELS.HAIKU]: { input: 0.8, output: 4 },
}

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

export function estimateMaxCents(
	model: ModelId,
	maxInputTokens: number,
	maxOutputTokens: number,
): number {
	return tokensToCents(model, maxInputTokens, maxOutputTokens)
}
