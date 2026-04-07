/**
 * Types for the TokenLedger — Meldar v3's per-user daily AI spend tracker.
 *
 * Spend is tracked in CENTS (integer EUR cents) to avoid floating-point
 * arithmetic on financial values. Conversion from token counts to cents
 * happens at the orchestrator boundary using the model price tables.
 */

/**
 * Result of a `tryDebit()` call. The operation either succeeds (fully
 * debited, ok=true) or fails because the user is over their daily ceiling
 * (ok=false). The shape mirrors what Upstash's Lua atomic-decrement script
 * returns.
 */
export type DebitResult =
	| {
			readonly ok: true
			/** Cents spent today AFTER this debit. */
			readonly spentCentsToday: number
			/** Cents remaining in today's budget AFTER this debit. */
			readonly remainingCentsToday: number
	  }
	| {
			readonly ok: false
			readonly reason: 'ceiling_exceeded'
			/** Cents already spent today (no change — debit was rejected). */
			readonly spentCentsToday: number
			/** Cents that would have been spent had we allowed it. */
			readonly attemptedCents: number
			/** The ceiling. */
			readonly ceilingCentsPerDay: number
	  }

export type SpendSnapshot = {
	readonly userId: string
	readonly spentCentsToday: number
	readonly ceilingCentsPerDay: number
	readonly remainingCentsToday: number
	/** Day key in YYYY-MM-DD UTC format — what the ledger is keyed against. */
	readonly day: string
}

/**
 * The hard ceiling for Sprint 1: 200 cents = EUR 2.00 per user per day.
 * Set by founder decision 2026-04-04 — chosen as the maximum acceptable
 * cost-per-acquisition burn rate during the founding-member period.
 *
 * Changing this value silently is dangerous (would un-cap all users
 * mid-day). The orchestrator reads from this constant; changes go through
 * the same review as any code change.
 */
export const DEFAULT_CEILING_CENTS_PER_DAY = 200 as const
