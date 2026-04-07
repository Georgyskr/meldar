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

if (!redis && process.env.NODE_ENV === 'production') {
	console.warn('[rate-limit] UPSTASH_REDIS not configured — rate limiting is DISABLED')
}

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

// 5 registrations per 15 minutes per IP
export const registerLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:register' })
	: null

// 120 /api/auth/me reads per minute per user (cheap, but not free — guards DB)
export const meLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'), prefix: 'rl:me' })
	: null

// 3 analysis requests per 10 minutes per IP (expensive AI call)
export const analyzeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '10 m'), prefix: 'rl:analyze' })
	: null

// 5 adaptive follow-up requests per minute per IP (cheap Haiku call)
export const adaptiveLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:adaptive' })
	: null

// 10 checkout requests per minute per IP
export const checkoutLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:checkout' })
	: null

// 3 password reset requests per hour per IP
export const resetLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:reset' })
	: null

// 10 project creations per hour per user
export const projectsCreateLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(10, '1 h'),
			prefix: 'rl:projects:create',
		})
	: null

// 60 project list reads per minute per user
export const projectsListLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(60, '1 m'),
			prefix: 'rl:projects:list',
		})
	: null

// 3 resend-verification emails per 15 minutes per user
export const resendVerifyLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(3, '15 m'),
			prefix: 'rl:resend-verify',
		})
	: null

// 5 build submissions per 10 minutes per user
export const workspaceBuildLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(5, '10 m'),
			prefix: 'rl:workspace-build',
		})
	: null

export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
	if (!limiter) return { success: true }
	return limiter.limit(identifier)
}

export function mustHaveRateLimit<T extends Ratelimit | null>(limiter: T, name: string): T {
	if (limiter === null && process.env.NODE_ENV === 'production') {
		throw new Error(
			`Rate limiter "${name}" is not initialized — UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in production`,
		)
	}
	return limiter
}
