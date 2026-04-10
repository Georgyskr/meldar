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

export const screentimeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:screentime' })
	: null

export const subscribeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:subscribe' })
	: null

export const quizLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:quiz' })
	: null

export const loginLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:login' })
	: null

export const registerLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:register' })
	: null

export const meLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'), prefix: 'rl:me' })
	: null

export const analyzeLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '10 m'), prefix: 'rl:analyze' })
	: null

export const adaptiveLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:adaptive' })
	: null

export const checkoutLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:checkout' })
	: null

export const resetLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:reset' })
	: null

export const projectsCreateLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(30, '1 h'),
			prefix: 'rl:projects:create',
		})
	: null

export const templateApplyLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(20, '1 h'),
			prefix: 'rl:template:apply',
		})
	: null

export const projectsListLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(60, '1 m'),
			prefix: 'rl:projects:list',
		})
	: null

export const resendVerifyLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(3, '15 m'),
			prefix: 'rl:resend-verify',
		})
	: null

export const workspaceBuildLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(30, '10 m'),
			prefix: 'rl:workspace-build',
		})
	: null

export const improvePromptLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(30, '5 m'),
			prefix: 'rl:improve-prompt',
		})
	: null

export const tokenReadLimit = redis
	? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:token-read' })
	: null

export const claimDailyLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(5, '15 m'),
			prefix: 'rl:claim-daily',
		})
	: null

export const cardsLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(30, '1 m'),
			prefix: 'rl:cards',
		})
	: null

export const generateProposalLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(10, '5 m'),
			prefix: 'rl:generate-proposal',
		})
	: null

export const wishesLimit = redis
	? new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(30, '1 m'),
			prefix: 'rl:wishes',
		})
	: null

export type RateLimitResult = { success: boolean; serviceError?: boolean }

export async function checkRateLimit(
	limiter: Ratelimit | null,
	identifier: string,
	critical = false,
): Promise<RateLimitResult> {
	if (!limiter) return { success: true }
	try {
		return await limiter.limit(identifier)
	} catch (err) {
		console.error('Rate limit check failed:', err instanceof Error ? err.message : 'Unknown')
		if (critical) return { success: false, serviceError: true }
		return { success: true }
	}
}

export function mustHaveRateLimit<T extends Ratelimit | null>(limiter: T, name: string): T {
	if (limiter === null && process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
		throw new Error(
			`Rate limiter "${name}" is not initialized — UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in production`,
		)
	}
	return limiter
}
