import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import { subscribers, users } from '@/server/db/schema'
import { signToken } from '@/server/identity/jwt'
import { hashPassword } from '@/server/identity/password'
import { checkRateLimit, subscribeLimit } from '@/server/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	name: z.string().min(1).optional(),
	marketingConsent: z.boolean().optional(),
})

function isUniqueViolation(err: unknown): boolean {
	return err instanceof Error && 'code' in err && (err as { code: string }).code === '23505'
}

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(subscribeLimit, ip)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
				{ status: 429 },
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

		const { email, password, name, marketingConsent } = parsed.data
		const db = getDb()
		const passwordHash = await hashPassword(password)
		const verifyToken = nanoid(32)

		// Insert directly — catch unique constraint violation for race condition safety
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
					marketingConsent: !!marketingConsent,
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

		// Also add to subscribers if marketing consent
		if (marketingConsent) {
			await db
				.insert(subscribers)
				.values({ email, source: 'register', foundingMember: false })
				.onConflictDoNothing()
		}

		// Send verification email (don't block response on failure)
		resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to: email,
			subject: 'Verify your Meldar account',
			html: `
				<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
					<h1 style="font-size: 24px; color: #623153;">Verify your email</h1>
					<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
						Click the link below to verify your account:
					</p>
					<a href="https://meldar.ai/api/auth/verify-email?token=${verifyToken}"
						style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #623153, #FFB876); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
						Verify my email
					</a>
					<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
						If you didn't create this account, ignore this email.
					</p>
				</div>
			`,
		})

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
