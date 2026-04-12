import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { setAuthCookie } from '@/server/identity/auth-cookie'
import { signToken } from '@/server/identity/jwt'
import { verifyPassword } from '@/server/identity/password'
import {
	checkRateLimit,
	loginEmailLimit,
	loginLimit,
	mustHaveRateLimit,
} from '@/server/lib/rate-limit'

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

const INVALID_CREDENTIALS = {
	error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
}

const DUMMY_HASH = '$2a$12$LJ3m4ys3Lg2VBe6p0C5LUOklGPixGilqH0UbIFp5EMz/EHXFGoR2u'

const limiter = mustHaveRateLimit(loginLimit, 'login')
const emailLimiter = mustHaveRateLimit(loginEmailLimit, 'login-email')

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const rateResult = await checkRateLimit(limiter, ip, true)
		if (!rateResult.success) {
			const status = rateResult.serviceError ? 503 : 429
			const code = rateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
			return NextResponse.json(
				{
					error: {
						code,
						message: 'Too many login attempts. Try again in 15 minutes.',
					},
				},
				{ status },
			)
		}

		let body: unknown
		try {
			body = await request.json()
		} catch {
			return NextResponse.json(
				{ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
				{ status: 400 },
			)
		}

		const parsed = loginSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Valid email and password required' } },
				{ status: 400 },
			)
		}

		const { email, password } = parsed.data

		const emailRateResult = await checkRateLimit(emailLimiter, email, true)
		if (!emailRateResult.success) {
			const status = emailRateResult.serviceError ? 503 : 429
			const code = emailRateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
			return NextResponse.json(
				{
					error: {
						code,
						message: 'Too many login attempts. Try again in 15 minutes.',
					},
				},
				{ status },
			)
		}

		const db = getDb()

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				passwordHash: users.passwordHash,
				emailVerified: users.emailVerified,
				tokenVersion: users.tokenVersion,
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		if (!user) {
			await verifyPassword(password, DUMMY_HASH)
			return NextResponse.json(INVALID_CREDENTIALS, { status: 401 })
		}

		const valid = await verifyPassword(password, user.passwordHash)
		if (!valid) {
			return NextResponse.json(INVALID_CREDENTIALS, { status: 401 })
		}

		const token = signToken({
			userId: user.id,
			email,
			emailVerified: user.emailVerified,
			tokenVersion: user.tokenVersion,
		})

		const response = NextResponse.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
			},
		})

		setAuthCookie(response, token)

		return response
	} catch (err) {
		console.error('Login error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } },
			{ status: 500 },
		)
	}
}
