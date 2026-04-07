/**
 * TokenLedger — per-user daily AI spend tracker with a hard ceiling.
 *
 * Backed by Upstash Redis with an atomic Lua script that combines INCRBY +
 * EXPIRE + the ceiling check in a single round-trip. This is the difference
 * between "two users racing past the ceiling" and "ceiling enforced
 * deterministically across concurrent requests."
 *
 * Key shape: `meldar:tokens:{userId}:{YYYY-MM-DD}` — dated so old days fall
 * out of Redis on TTL without needing a sweeper job.
 *
 * Why fail-closed on Redis errors:
 *   We CANNOT debit if we don't know the user's current spend, because the
 *   only safety against runaway costs is this counter. If the orchestrator
 *   is allowed to swallow Redis errors and proceed, a Redis outage becomes
 *   a "spend everything" event. The right behavior is: if we can't track,
 *   we don't spend.
 *
 * Two implementations live in this file:
 *   - {@link UpstashTokenLedger} — production
 *   - {@link InMemoryTokenLedger} — fast unit tests, also used by the
 *     orchestrator's in-memory dev mode
 *
 * Both satisfy the {@link TokenLedger} interface.
 */

import type { Redis } from '@upstash/redis'
import { CeilingExceededError, TokenLedgerBackendError } from './errors'
import { DEFAULT_CEILING_CENTS_PER_DAY, type DebitResult, type SpendSnapshot } from './types'

export interface TokenLedger {
	/**
	 * Atomically attempt to debit `cents` from the user's daily budget.
	 *
	 * - If the debit would NOT exceed the ceiling: applies it and returns
	 *   `{ok: true, spentCentsToday, remainingCentsToday}`.
	 * - If it WOULD exceed: rejects without changing state and returns
	 *   `{ok: false, reason: 'ceiling_exceeded', ...}`.
	 *
	 * Both branches return successfully — exceptions are reserved for
	 * backend failures (Redis down, malformed reply, etc.). Callers should
	 * check `result.ok` first.
	 */
	tryDebit(userId: string, cents: number): Promise<DebitResult>

	/**
	 * Convenience wrapper that throws {@link CeilingExceededError} on a
	 * rejected debit instead of returning the discriminated union. Use this
	 * when you want exception-driven control flow (e.g., wrapping an AI
	 * call in a single try/catch).
	 */
	debitOrThrow(userId: string, cents: number): Promise<void>

	/**
	 * Read the current spend snapshot for a user without changing it.
	 * Returns zero spend for users who haven't spent today.
	 */
	getSnapshot(userId: string): Promise<SpendSnapshot>
}

// ── Upstash implementation ──────────────────────────────────────────────────

/**
 * Lua script: atomically INCR by `cents`, set TTL on first write, check the
 * ceiling, and roll back if the increment would exceed.
 *
 * Returns: [ok (1|0), spent_cents]
 *   - ok=1: spent_cents = total spent today AFTER increment
 *   - ok=0: spent_cents = total spent today BEFORE the rejected attempt
 */
const ATOMIC_DEBIT_LUA = `
local key = KEYS[1]
local cents = tonumber(ARGV[1])
local ceiling = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local current = tonumber(redis.call('GET', key) or '0')
if current + cents > ceiling then
  return {0, current}
end

local new_total = redis.call('INCRBY', key, cents)
if redis.call('TTL', key) < 0 then
  redis.call('EXPIRE', key, ttl)
end
return {1, tonumber(new_total)}
`

export type UpstashTokenLedgerConfig = {
	readonly redis: Redis
	/** Ceiling in EUR cents per user per UTC day. */
	readonly ceilingCentsPerDay?: number
	/** TTL on Redis keys, defaults to 26 hours so day boundaries always have buffer. */
	readonly keyTtlSeconds?: number
	/**
	 * Override the day key generator (test injection). Defaults to
	 * `new Date().toISOString().slice(0, 10)`.
	 */
	readonly nowDay?: () => string
}

export class UpstashTokenLedger implements TokenLedger {
	private readonly redis: Redis
	private readonly ceiling: number
	private readonly ttl: number
	private readonly nowDay: () => string

	constructor(config: UpstashTokenLedgerConfig) {
		this.redis = config.redis
		this.ceiling = config.ceilingCentsPerDay ?? DEFAULT_CEILING_CENTS_PER_DAY
		this.ttl = config.keyTtlSeconds ?? 26 * 60 * 60
		this.nowDay = config.nowDay ?? (() => new Date().toISOString().slice(0, 10))
	}

	private key(userId: string): string {
		return `meldar:tokens:${userId}:${this.nowDay()}`
	}

	async tryDebit(userId: string, cents: number): Promise<DebitResult> {
		assertPositiveInteger(cents)
		const key = this.key(userId)

		let result: unknown
		try {
			result = await this.redis.eval(
				ATOMIC_DEBIT_LUA,
				[key],
				[cents.toString(), this.ceiling.toString(), this.ttl.toString()],
			)
		} catch (err) {
			throw new TokenLedgerBackendError(`upstash eval failed: ${formatErr(err)}`, {
				userId,
				cause: err,
			})
		}

		// Upstash returns Lua tables as JS arrays. Validate strictly.
		if (!Array.isArray(result) || result.length !== 2) {
			throw new TokenLedgerBackendError(`unexpected Lua reply shape: ${JSON.stringify(result)}`, {
				userId,
			})
		}
		const [okFlag, spentNum] = result
		const ok = Number(okFlag) === 1
		const spent = Number(spentNum)
		if (Number.isNaN(spent)) {
			throw new TokenLedgerBackendError(`Lua reply spent=${spentNum} is not a number`, { userId })
		}

		if (ok) {
			return {
				ok: true,
				spentCentsToday: spent,
				remainingCentsToday: Math.max(0, this.ceiling - spent),
			}
		}
		return {
			ok: false,
			reason: 'ceiling_exceeded',
			spentCentsToday: spent,
			attemptedCents: cents,
			ceilingCentsPerDay: this.ceiling,
		}
	}

	async debitOrThrow(userId: string, cents: number): Promise<void> {
		const result = await this.tryDebit(userId, cents)
		if (!result.ok) {
			throw new CeilingExceededError(
				userId,
				result.spentCentsToday,
				result.attemptedCents,
				result.ceilingCentsPerDay,
			)
		}
	}

	async getSnapshot(userId: string): Promise<SpendSnapshot> {
		let value: string | number | null
		try {
			value = await this.redis.get(this.key(userId))
		} catch (err) {
			throw new TokenLedgerBackendError(`upstash get failed: ${formatErr(err)}`, {
				userId,
				cause: err,
			})
		}
		const spent = value == null ? 0 : Number(value)
		if (Number.isNaN(spent)) {
			throw new TokenLedgerBackendError(`stored value not numeric: ${value}`, { userId })
		}
		return {
			userId,
			day: this.nowDay(),
			spentCentsToday: spent,
			ceilingCentsPerDay: this.ceiling,
			remainingCentsToday: Math.max(0, this.ceiling - spent),
		}
	}
}

// ── In-memory implementation ────────────────────────────────────────────────

/**
 * In-memory ledger for unit tests, dev mode, and CI without Redis.
 *
 * NOT thread-safe. NOT for production. Throws if constructed with
 * NODE_ENV=production to catch mis-wiring at startup.
 */
export class InMemoryTokenLedger implements TokenLedger {
	private readonly store = new Map<string, number>() // key → cents
	private readonly ceiling: number
	private readonly nowDay: () => string

	constructor(config?: {
		ceilingCentsPerDay?: number
		nowDay?: () => string
	}) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'InMemoryTokenLedger may not be constructed in production — use UpstashTokenLedger',
			)
		}
		this.ceiling = config?.ceilingCentsPerDay ?? DEFAULT_CEILING_CENTS_PER_DAY
		this.nowDay = config?.nowDay ?? (() => new Date().toISOString().slice(0, 10))
	}

	private key(userId: string): string {
		return `${userId}:${this.nowDay()}`
	}

	async tryDebit(userId: string, cents: number): Promise<DebitResult> {
		assertPositiveInteger(cents)
		const key = this.key(userId)
		const current = this.store.get(key) ?? 0
		if (current + cents > this.ceiling) {
			return {
				ok: false,
				reason: 'ceiling_exceeded',
				spentCentsToday: current,
				attemptedCents: cents,
				ceilingCentsPerDay: this.ceiling,
			}
		}
		const newTotal = current + cents
		this.store.set(key, newTotal)
		return {
			ok: true,
			spentCentsToday: newTotal,
			remainingCentsToday: Math.max(0, this.ceiling - newTotal),
		}
	}

	async debitOrThrow(userId: string, cents: number): Promise<void> {
		const result = await this.tryDebit(userId, cents)
		if (!result.ok) {
			throw new CeilingExceededError(
				userId,
				result.spentCentsToday,
				result.attemptedCents,
				result.ceilingCentsPerDay,
			)
		}
	}

	async getSnapshot(userId: string): Promise<SpendSnapshot> {
		const spent = this.store.get(this.key(userId)) ?? 0
		return {
			userId,
			day: this.nowDay(),
			spentCentsToday: spent,
			ceilingCentsPerDay: this.ceiling,
			remainingCentsToday: Math.max(0, this.ceiling - spent),
		}
	}

	// Test-only helper to clear state.
	clear(): void {
		this.store.clear()
	}
}

// ── helpers ─────────────────────────────────────────────────────────────────

function assertPositiveInteger(cents: number): void {
	if (!Number.isInteger(cents) || cents <= 0) {
		throw new Error(`debit amount must be a positive integer (got: ${cents})`)
	}
}

function formatErr(err: unknown): string {
	if (err instanceof Error) return err.message
	return String(err)
}
