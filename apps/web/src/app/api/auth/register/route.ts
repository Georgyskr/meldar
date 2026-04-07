import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signToken } from '@/server/identity/jwt'
import { hashPassword } from '@/server/identity/password'
import { mustHaveRateLimit, registerLimit } from '@/server/lib/rate-limit'

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	name: z.string().min(1).optional(),
})

function isUniqueViolation(err: unknown): boolean {
	return err instanceof Error && 'code' in err && (err as { code: string }).code === '23505'
}

const limiter = mustHaveRateLimit(registerLimit, 'register')

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		if (limiter) {
			const { success } = await limiter.limit(ip)
			if (!success) {
				return NextResponse.json(
					{ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
					{ status: 429 },
				)
			}
		}

		const body = await request.json()
		const parsed = registerSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { email, password, name } = parsed.data
		const db = getDb()
		const passwordHash = await hashPassword(password)

		let userId: string
		try {
			const [user] = await db
				.insert(users)
				.values({
					email,
					passwordHash,
					name: name || null,
				})
				.returning({ id: users.id })
			userId = user.id
		} catch (err) {
			if (isUniqueViolation(err)) {
				return NextResponse.json(
					{ error: { code: 'CONFLICT', message: 'An account with this email already exists' } },
					{ status: 409 },
				)
			}
			throw err
		}

		const token = signToken({ userId, email })

		const response = NextResponse.json({ success: true, userId })
		response.cookies.set('meldar-auth', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		return response
	} catch (err) {
		console.error('Register error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } },
			{ status: 500 },
		)
	}
}
