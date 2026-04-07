import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { checkRateLimit, resetLimit } from '@/server/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

const forgotSchema = z.object({
	email: z.string().email(),
})

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(resetLimit, ip)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
				{ status: 429 },
			)
		}

		const body = await request.json()
		const parsed = forgotSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Valid email required' } },
				{ status: 400 },
			)
		}

		const { email } = parsed.data
		const db = getDb()

		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		// Always return success to prevent email enumeration
		if (!user) {
			return NextResponse.json({ success: true })
		}

		const resetToken = nanoid(32)
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

		await db
			.update(users)
			.set({
				resetToken,
				resetTokenExpiresAt: expiresAt,
			})
			.where(eq(users.email, email))

		await resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to: email,
			subject: 'Reset your Meldar password',
			html: `
				<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
					<h1 style="font-size: 24px; color: #623153;">Reset your password</h1>
					<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
						Click below to set a new password. This link expires in 1 hour.
					</p>
					<a href="https://meldar.ai/reset-password?token=${resetToken}"
						style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #623153, #FFB876); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
						Reset password
					</a>
					<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
						If you didn't request this, ignore this email.
					</p>
				</div>
			`,
		})

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Forgot password error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Request failed' } },
			{ status: 500 },
		)
	}
}
