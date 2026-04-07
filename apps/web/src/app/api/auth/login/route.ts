import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signToken } from '@/server/identity/jwt'
import { verifyPassword } from '@/server/identity/password'
import { checkRateLimit, loginLimit } from '@/server/lib/rate-limit'

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

const INVALID_CREDENTIALS = {
	error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
}

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(loginLimit, ip)
		if (!success) {
			return NextResponse.json(
				{
					error: {
						code: 'RATE_LIMITED',
						message: 'Too many login attempts. Try again in 15 minutes.',
					},
				},
				{ status: 429 },
			)
		}

		const body = await request.json()
		const parsed = loginSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Valid email and password required' } },
				{ status: 400 },
			)
		}

		const { email, password } = parsed.data
		const db = getDb()

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				passwordHash: users.passwordHash,
				emailVerified: users.emailVerified,
				xrayUsageCount: users.xrayUsageCount,
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		if (!user) {
			return NextResponse.json(INVALID_CREDENTIALS, { status: 401 })
		}

		const valid = await verifyPassword(password, user.passwordHash)
		if (!valid) {
			return NextResponse.json(INVALID_CREDENTIALS, { status: 401 })
		}

		const token = signToken({ userId: user.id, email })

		const response = NextResponse.json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				emailVerified: user.emailVerified,
				xrayUsageCount: user.xrayUsageCount,
			},
		})

		response.cookies.set('meldar-auth', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		return response
	} catch (err) {
		console.error('Login error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } },
			{ status: 500 },
		)
	}
}
