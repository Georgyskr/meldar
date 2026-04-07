import { getDb } from '@meldar/db/client'
import { getTokenBalance, getTransactionHistory } from '@meldar/tokens'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/server/identity/jwt'
import { checkRateLimit, tokenReadLimit } from '@/server/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(tokenReadLimit, session.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a moment.' } },
			{ status: 429 },
		)
	}

	try {
		const db = getDb()
		const [balance, transactions] = await Promise.all([
			getTokenBalance(db, session.userId),
			getTransactionHistory(db, session.userId, 20),
		])

		return NextResponse.json({ balance, transactions })
	} catch (err) {
		console.error(
			'[tokens] Failed to fetch token data:',
			err instanceof Error ? err.message : 'Unknown',
		)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch token data' } },
			{ status: 500 },
		)
	}
}
