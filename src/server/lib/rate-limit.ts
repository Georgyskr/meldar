import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function getRedis() {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return null
	}
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

const redis = getRedis()

// 5 screenshot uploads per minute per IP
export const screentimeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:screentime' })
	: null

// 3 subscribe requests per hour per IP
export const subscribeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:subscribe' })
	: null

// 10 quiz submissions per minute per IP
export const quizLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:quiz' })
	: null

// 5 login attempts per 15 minutes per IP
export const loginLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:login' })
	: null

// 3 password reset requests per hour per IP
export const resetLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:reset' })
	: null

export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
	if (!limiter) return { success: true }
	return limiter.limit(identifier)
}
