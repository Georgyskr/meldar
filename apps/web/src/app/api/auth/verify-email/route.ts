import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, signToken } from '@/server/identity/jwt'
import { checkRateLimit, mustHaveRateLimit, resetLimit } from '@/server/lib/rate-limit'

const limiter = mustHaveRateLimit(resetLimit, 'verify-email')

export async function GET(request: NextRequest) {
	const token = request.nextUrl.searchParams.get('token')

	if (!token) {
		return NextResponse.redirect(new URL('/sign-in?error=invalid-token', request.url))
	}

	const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
	const rateResult = await checkRateLimit(limiter, ip, true)
	if (!rateResult.success) {
		if (rateResult.serviceError) {
			return NextResponse.redirect(new URL('/sign-in?error=service-unavailable', request.url))
		}
		return NextResponse.redirect(new URL('/sign-in?error=rate-limited', request.url))
	}

	const db = getDb()

	const [user] = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(and(eq(users.verifyToken, token), gt(users.verifyTokenExpiresAt, new Date())))
		.limit(1)

	if (!user) {
		return NextResponse.redirect(new URL('/sign-in?error=invalid-token', request.url))
	}

	await db
		.update(users)
		.set({
			emailVerified: true,
			verifyToken: null,
			verifyTokenExpiresAt: null,
		})
		.where(eq(users.id, user.id))

	const response = NextResponse.redirect(new URL('/workspace?verified=1', request.url))

	const session = getUserFromRequest(request)
	if (session && session.userId === user.id) {
		const refreshed = signToken({ userId: user.id, email: user.email, emailVerified: true })
		response.cookies.set('meldar-auth', refreshed, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})
	}

	return response
}
