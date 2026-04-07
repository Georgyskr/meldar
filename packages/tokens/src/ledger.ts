import type { Redis } from '@upstash/redis'
import { CeilingExceededError, TokenLedgerBackendError } from './errors'
import { DEFAULT_CEILING_CENTS_PER_DAY, type DebitResult, type SpendSnapshot } from './types'

export interface TokenLedger {
	tryDebit(userId: string, cents: number): Promise<DebitResult>
	debitOrThrow(userId: string, cents: number): Promise<void>
	getSnapshot(userId: string): Promise<SpendSnapshot>
}

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
	readonly ceilingCentsPerDay?: number
	readonly keyTtlSeconds?: number
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

export class InMemoryTokenLedger implements TokenLedger {
	private readonly store = new Map<string, number>()
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

	clear(): void {
		this.store.clear()
	}
}

function assertPositiveInteger(cents: number): void {
	if (!Number.isInteger(cents) || cents <= 0) {
		throw new Error(`debit amount must be a positive integer (got: ${cents})`)
	}
}

function formatErr(err: unknown): string {
	if (err instanceof Error) return err.message
	return String(err)
}
