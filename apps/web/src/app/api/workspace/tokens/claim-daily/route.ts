import { getDb } from '@meldar/db/client'
import { creditTokens, DEFAULT_TOKEN_ECONOMY, getTokenBalance } from '@meldar/tokens'
import { Redis } from '@upstash/redis'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/server/identity/jwt'
import { checkRateLimit, claimDailyLimit } from '@/server/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRedis(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return null
	}
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

export async function POST(request: NextRequest) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const rateResult = await checkRateLimit(claimDailyLimit, session.userId, true)
	if (!rateResult.success) {
		const status = rateResult.serviceError ? 503 : 429
		const code = rateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
		return NextResponse.json(
			{ error: { code, message: 'Too many requests. Wait a few minutes.' } },
			{ status },
		)
	}

	const redis = getRedis()
	if (!redis) {
		return NextResponse.json(
			{ error: { code: 'SERVICE_UNAVAILABLE', message: 'Cannot verify daily claim' } },
			{ status: 503 },
		)
	}

	const key = `meldar:daily-bonus:${session.userId}:${new Date().toISOString().slice(0, 10)}`
	const claimed = await redis.set(key, '1', { ex: 86400, nx: true })
	if (!claimed) {
		const db = getDb()
		return NextResponse.json({
			alreadyClaimed: true,
			balance: await getTokenBalance(db, session.userId),
		})
	}

	const db = getDb()
	const dailyBonusAmount = DEFAULT_TOKEN_ECONOMY.dailyEarnCap

	try {
		const { balance } = await creditTokens(db, session.userId, dailyBonusAmount, 'daily_bonus')
		return NextResponse.json({ alreadyClaimed: false, credited: dailyBonusAmount, balance })
	} catch (err) {
		await redis.del(key).catch(() => {})
		throw err
	}
}
