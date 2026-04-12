import { getDb } from '@meldar/db/client'
import { getTokenBalance, getTransactionHistory } from '@meldar/tokens'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/server/identity/require-auth'
import { checkRateLimit, tokenReadLimit } from '@/server/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success } = await checkRateLimit(tokenReadLimit, auth.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a moment.' } },
			{ status: 429 },
		)
	}

	try {
		const db = getDb()
		const [balance, transactions] = await Promise.all([
			getTokenBalance(db, auth.userId),
			getTransactionHistory(db, auth.userId, 20),
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
