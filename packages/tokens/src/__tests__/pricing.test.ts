import { describe, expect, it } from 'vitest'
import { MODELS } from '../models'
import { estimateMaxCents, tokensToCents, usageToCents } from '../pricing'

describe('tokensToCents', () => {
	it('returns at least 1 cent for any non-zero usage (round-up safety)', () => {
		expect(tokensToCents(MODELS.HAIKU, 1, 0)).toBeGreaterThanOrEqual(1)
		expect(tokensToCents(MODELS.HAIKU, 0, 1)).toBeGreaterThanOrEqual(1)
	})

	it('Haiku is cheaper than Sonnet for the same token usage', () => {
		const haiku = tokensToCents(MODELS.HAIKU, 100_000, 10_000)
		const sonnet = tokensToCents(MODELS.SONNET, 100_000, 10_000)
		expect(haiku).toBeLessThan(sonnet)
	})

	it('Sonnet is cheaper than Opus for the same token usage', () => {
		const sonnet = tokensToCents(MODELS.SONNET, 100_000, 10_000)
		const opus = tokensToCents(MODELS.OPUS, 100_000, 10_000)
		expect(sonnet).toBeLessThan(opus)
	})

	it('Opus 100k input + 10k output is reasonable (~150-180 cents at current prices)', () => {
		// Sanity check the math: 100k input * $15/Mtok + 10k output * $75/Mtok = $1.50 + $0.75 = $2.25 USD
		// $2.25 * 0.93 = ~209 cents EUR. Within +/-10% acceptable.
		const c = tokensToCents(MODELS.OPUS, 100_000, 10_000)
		expect(c).toBeGreaterThan(150)
		expect(c).toBeLessThan(250)
	})

	it('throws for unknown model', () => {
		// biome-ignore lint/suspicious/noExplicitAny: testing the error path
		expect(() => tokensToCents('claude-fake-model' as any, 1000, 1000)).toThrow(/unknown model/)
	})

	it('rounds up fractional cents (always conservative)', () => {
		// 1 input token on Haiku = 0.0008 USD per Mtok / 1M * 1 = practically 0
		// But round-up + min(1) means we always charge at least 1c.
		expect(tokensToCents(MODELS.HAIKU, 1, 0)).toBe(1)
	})

	it('output tokens cost more than input tokens', () => {
		const inputOnly = tokensToCents(MODELS.SONNET, 100_000, 0)
		const outputOnly = tokensToCents(MODELS.SONNET, 0, 100_000)
		expect(outputOnly).toBeGreaterThan(inputOnly)
	})
})

describe('estimateMaxCents', () => {
	it('matches tokensToCents for the same inputs (it is a worst-case estimator)', () => {
		expect(estimateMaxCents(MODELS.SONNET, 50_000, 10_000)).toBe(
			tokensToCents(MODELS.SONNET, 50_000, 10_000),
		)
	})
})

describe('usageToCents (prompt caching)', () => {
	it('matches tokensToCents when no cache fields are present', () => {
		expect(usageToCents(MODELS.SONNET, { inputTokens: 50_000, outputTokens: 10_000 })).toBe(
			tokensToCents(MODELS.SONNET, 50_000, 10_000),
		)
	})

	it('cache reads cost ~10% of regular input tokens', () => {
		const freshInput = usageToCents(MODELS.SONNET, { inputTokens: 100_000, outputTokens: 0 })
		const cachedInput = usageToCents(MODELS.SONNET, {
			inputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 100_000,
		})
		const ratio = cachedInput / freshInput
		expect(ratio).toBeGreaterThan(0.08)
		expect(ratio).toBeLessThan(0.12)
	})

	it('cache writes cost ~25% more than regular input tokens', () => {
		const freshInput = usageToCents(MODELS.SONNET, { inputTokens: 100_000, outputTokens: 0 })
		const cacheWrite = usageToCents(MODELS.SONNET, {
			inputTokens: 0,
			outputTokens: 0,
			cacheWriteTokens: 100_000,
		})
		const ratio = cacheWrite / freshInput
		expect(ratio).toBeGreaterThan(1.2)
		expect(ratio).toBeLessThan(1.3)
	})

	it('cached build is significantly cheaper than uncached (input savings only, output still billed)', () => {
		const uncached = usageToCents(MODELS.SONNET, {
			inputTokens: 100_000,
			outputTokens: 20_000,
		})
		const cached = usageToCents(MODELS.SONNET, {
			inputTokens: 5_000,
			outputTokens: 20_000,
			cacheReadTokens: 95_000,
		})
		expect(cached).toBeLessThan(uncached * 0.7)
		expect(cached).toBeGreaterThan(uncached * 0.35)
	})

	it('cached build with low output tokens shows massive savings (input-dominated)', () => {
		const uncached = usageToCents(MODELS.SONNET, {
			inputTokens: 100_000,
			outputTokens: 500,
		})
		const cached = usageToCents(MODELS.SONNET, {
			inputTokens: 5_000,
			outputTokens: 500,
			cacheReadTokens: 95_000,
		})
		expect(cached).toBeLessThan(uncached * 0.25)
	})
})
