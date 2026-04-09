import { Redis } from '@upstash/redis'

export type VisitStreakResult = {
	readonly streak: number
	readonly isNewDay: boolean
}

const STREAK_TTL_SECONDS = 48 * 60 * 60

const TRACK_STREAK_LUA = `
local key = KEYS[1]
local today = ARGV[1]
local yesterday = ARGV[2]
local ttl = tonumber(ARGV[3])
local last = redis.call('HGET', key, 'lastVisit')
if last == today then
	local count = tonumber(redis.call('HGET', key, 'count')) or 1
	return {0, count}
end
local newCount
if last == yesterday then
	newCount = (tonumber(redis.call('HGET', key, 'count')) or 0) + 1
else
	newCount = 1
end
redis.call('HSET', key, 'lastVisit', today, 'count', tostring(newCount))
redis.call('EXPIRE', key, ttl)
return {1, newCount}
`

function getRedis(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return null
	}
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

function utcDateKey(offsetDays = 0): string {
	const d = new Date()
	d.setUTCDate(d.getUTCDate() + offsetDays)
	return d.toISOString().slice(0, 10)
}

export async function trackVisitStreak(userId: string): Promise<VisitStreakResult> {
	const redis = getRedis()
	if (!redis) {
		return { streak: 0, isNewDay: false }
	}

	const key = `meldar:streak:${userId}`
	const today = utcDateKey(0)
	const yesterday = utcDateKey(-1)

	try {
		const result = (await redis.eval(
			TRACK_STREAK_LUA,
			[key],
			[today, yesterday, String(STREAK_TTL_SECONDS)],
		)) as [number, number] | null

		if (!result || !Array.isArray(result)) {
			return { streak: 0, isNewDay: false }
		}

		const [isNewDayFlag, count] = result
		return { streak: Number(count), isNewDay: isNewDayFlag === 1 }
	} catch {
		return { streak: 0, isNewDay: false }
	}
}
