import { getDb } from '@meldar/db/client'
import { tokenTransactions, users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getBaseUrl, sendVerificationEmail, sendWelcomeEmail } from '@/server/email'
import { signToken } from '@/server/identity/jwt'
import { hashPassword } from '@/server/identity/password'
import { checkRateLimit, mustHaveRateLimit, registerLimit } from '@/server/lib/rate-limit'

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
		const rateResult = await checkRateLimit(limiter, ip, true)
		if (!rateResult.success) {
			const status = rateResult.serviceError ? 503 : 429
			const code = rateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
			return NextResponse.json(
				{ error: { code, message: 'Too many attempts. Try again later.' } },
				{ status },
			)
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
		const verifyToken = nanoid(32)

		let userId: string
		try {
			const [user] = await db
				.insert(users)
				.values({
					email,
					passwordHash,
					name: name || null,
					verifyToken,
					verifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

		await db.insert(tokenTransactions).values({
			id: crypto.randomUUID(),
			userId,
			amount: 200,
			reason: 'signup_bonus',
			referenceId: null,
			balanceAfter: 200,
		})

		sendVerificationEmail(email, verifyToken, getBaseUrl()).catch((err) => {
			console.error('Verification email failed:', err instanceof Error ? err.message : 'Unknown')
		})

		sendWelcomeEmail(email, name || null)
			.then(async () => {
				await db.update(users).set({ welcomeEmailSentAt: new Date() }).where(eq(users.id, userId))
			})
			.catch((err) => {
				console.error('Welcome email failed:', err instanceof Error ? err.message : 'Unknown')
			})

		const token = signToken({ userId, email, emailVerified: false })

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
