import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { getBaseUrl, sendVerificationEmail } from '@/server/email'
import { getUserFromRequest } from '@/server/identity/jwt'
import { mustHaveRateLimit, resendVerifyLimit } from '@/server/lib/rate-limit'

const limiter = mustHaveRateLimit(resendVerifyLimit, 'resend-verification')

export async function POST(request: NextRequest) {
	try {
		const session = getUserFromRequest(request)
		if (!session) {
			return NextResponse.json(
				{ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 },
			)
		}

		if (limiter) {
			const { success } = await limiter.limit(session.userId)
			if (!success) {
				return NextResponse.json(
					{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
					{ status: 429 },
				)
			}
		}

		const db = getDb()

		const [user] = await db
			.select({ id: users.id, emailVerified: users.emailVerified })
			.from(users)
			.where(eq(users.id, session.userId))
			.limit(1)

		if (!user) {
			return NextResponse.json(
				{ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 },
			)
		}

		if (user.emailVerified) {
			return NextResponse.json({ success: true })
		}

		const verifyToken = nanoid(32)
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

		await db
			.update(users)
			.set({
				verifyToken,
				verifyTokenExpiresAt: expiresAt,
			})
			.where(eq(users.id, user.id))

		try {
			await sendVerificationEmail(session.email, verifyToken, getBaseUrl(request))
		} catch (err) {
			console.error('Verification email failed:', err instanceof Error ? err.message : 'Unknown')
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Resend verification error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Request failed' } },
			{ status: 500 },
		)
	}
}
