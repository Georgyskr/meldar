import type { GlobalSpendGuard } from '@meldar/orchestrator'
import { Redis } from '@upstash/redis'

const DEFAULT_GLOBAL_DAILY_CEILING_CENTS = 3000
const DEFAULT_USER_HOURLY_CEILING_CENTS = 80
const DEFAULT_USER_DAILY_CEILING_CENTS = 200

function getRedis(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return null
	}
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

const redis = getRedis()

function todayKey(): string {
	const now = new Date()
	const y = now.getUTCFullYear()
	const m = String(now.getUTCMonth() + 1).padStart(2, '0')
	const d = String(now.getUTCDate()).padStart(2, '0')
	return `meldar:global:spend:${y}-${m}-${d}`
}

function userHourKey(userId: string): string {
	const now = new Date()
	const y = now.getUTCFullYear()
	const m = String(now.getUTCMonth() + 1).padStart(2, '0')
	const d = String(now.getUTCDate()).padStart(2, '0')
	const h = String(now.getUTCHours()).padStart(2, '0')
	return `meldar:user:spend:${userId}:${y}-${m}-${d}-${h}`
}

function userDayKey(userId: string): string {
	const now = new Date()
	const y = now.getUTCFullYear()
	const m = String(now.getUTCMonth() + 1).padStart(2, '0')
	const d = String(now.getUTCDate()).padStart(2, '0')
	return `meldar:user:spend-day:${userId}:${y}-${m}-${d}`
}

function userHourlyCeiling(): number {
	const env = process.env.USER_HOURLY_CEILING_CENTS
	if (!env) return DEFAULT_USER_HOURLY_CEILING_CENTS
	const parsed = Number.parseInt(env, 10)
	if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_USER_HOURLY_CEILING_CENTS
	return parsed
}

function userDailyCeiling(): number {
	const env = process.env.USER_DAILY_CEILING_CENTS
	if (!env) return DEFAULT_USER_DAILY_CEILING_CENTS
	const parsed = Number.parseInt(env, 10)
	if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_USER_DAILY_CEILING_CENTS
	return parsed
}

function ceilingCents(): number {
	const env = process.env.GLOBAL_DAILY_CEILING_CENTS
	if (!env) return DEFAULT_GLOBAL_DAILY_CEILING_CENTS
	const parsed = Number.parseInt(env, 10)
	if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_GLOBAL_DAILY_CEILING_CENTS
	return parsed
}

export type SpendCeilingCheck =
	| { allowed: true; spentToday: number; ceiling: number }
	| { allowed: false; reason: 'paused' | 'ceiling_exceeded'; spentToday: number; ceiling: number }

export async function checkGlobalSpendCeiling(): Promise<SpendCeilingCheck> {
	const ceiling = ceilingCents()

	if (process.env.ANTHROPIC_PAUSED === '1') {
		return { allowed: false, reason: 'paused', spentToday: 0, ceiling }
	}

	if (!redis) {
		return { allowed: true, spentToday: 0, ceiling }
	}

	const spent = ((await redis.get<number>(todayKey())) ?? 0) as number
	if (spent >= ceiling) {
		return { allowed: false, reason: 'ceiling_exceeded', spentToday: spent, ceiling }
	}
	return { allowed: true, spentToday: spent, ceiling }
}

export async function recordGlobalSpend(cents: number): Promise<void> {
	if (!redis || cents <= 0) return
	const key = todayKey()
	await redis.incrby(key, cents)
	// Unconditional expire refresh — idempotent and avoids the TTL race where a
	// first-writer's expire call fails silently and the key lives forever.
	await redis.expire(key, 60 * 60 * 36)
}

export async function getGlobalSpendToday(): Promise<{ spent: number; ceiling: number }> {
	const ceiling = ceilingCents()
	if (!redis) return { spent: 0, ceiling }
	const spent = ((await redis.get<number>(todayKey())) ?? 0) as number
	return { spent, ceiling }
}

export type UserHourlySpendCheck =
	| { allowed: true; spentThisHour: number; ceiling: number }
	| { allowed: false; spentThisHour: number; ceiling: number }

export async function checkUserHourlySpend(userId: string): Promise<UserHourlySpendCheck> {
	const ceiling = userHourlyCeiling()
	if (!redis) return { allowed: true, spentThisHour: 0, ceiling }
	const spent = ((await redis.get<number>(userHourKey(userId))) ?? 0) as number
	if (spent >= ceiling) {
		return { allowed: false, spentThisHour: spent, ceiling }
	}
	return { allowed: true, spentThisHour: spent, ceiling }
}

export async function recordUserHourlySpend(userId: string, cents: number): Promise<void> {
	if (!redis || cents <= 0) return
	const key = userHourKey(userId)
	await redis.incrby(key, cents)
	await redis.expire(key, 60 * 75)
}

export async function checkUserDailySpend(
	userId: string,
): Promise<
	| { allowed: true; spentToday: number; ceiling: number }
	| { allowed: false; spentToday: number; ceiling: number }
> {
	const ceiling = userDailyCeiling()
	if (!redis) return { allowed: true, spentToday: 0, ceiling }
	const spent = ((await redis.get<number>(userDayKey(userId))) ?? 0) as number
	if (spent >= ceiling) {
		return { allowed: false, spentToday: spent, ceiling }
	}
	return { allowed: true, spentToday: spent, ceiling }
}

export async function recordUserDailySpend(userId: string, cents: number): Promise<void> {
	if (!redis || cents <= 0) return
	const key = userDayKey(userId)
	await redis.incrby(key, cents)
	await redis.expire(key, 60 * 60 * 36)
}

export async function checkAllSpendCeilings(userId: string): Promise<
	| { allowed: true }
	| {
			allowed: false
			reason: 'paused' | 'global_ceiling' | 'user_hourly' | 'user_daily'
			userMessage: string
	  }
> {
	const global = await checkGlobalSpendCeiling()
	if (!global.allowed) {
		return {
			allowed: false,
			reason: global.reason === 'paused' ? 'paused' : 'global_ceiling',
			userMessage: 'Meldar is taking a breather. We will be back shortly.',
		}
	}
	const hourly = await checkUserHourlySpend(userId)
	if (!hourly.allowed) {
		return {
			allowed: false,
			reason: 'user_hourly',
			userMessage: 'Whoa — give Meldar a second. Try again in a few minutes.',
		}
	}
	const daily = await checkUserDailySpend(userId)
	if (!daily.allowed) {
		return {
			allowed: false,
			reason: 'user_daily',
			userMessage: "You've used all your energy for today. You'll get more tomorrow.",
		}
	}
	return { allowed: true }
}

async function recordAllSpend(userId: string, cents: number): Promise<void> {
	await Promise.all([
		recordGlobalSpend(cents),
		recordUserHourlySpend(userId, cents),
		recordUserDailySpend(userId, cents),
	])
}

export function createSpendGuardForUser(userId: string): GlobalSpendGuard {
	return {
		check: async () => {
			const result = await checkAllSpendCeilings(userId)
			if (result.allowed) {
				const { spent, ceiling } = await getGlobalSpendToday()
				return { allowed: true, spentToday: spent, ceiling }
			}
			const { spent, ceiling } = await getGlobalSpendToday()
			return {
				allowed: false,
				reason: result.reason === 'paused' ? 'paused' : 'ceiling_exceeded',
				spentToday: spent,
				ceiling,
			}
		},
		record: (cents: number) => recordAllSpend(userId, cents),
	}
}

export const globalSpendGuard: GlobalSpendGuard = {
	check: checkGlobalSpendCeiling,
	record: recordGlobalSpend,
}
