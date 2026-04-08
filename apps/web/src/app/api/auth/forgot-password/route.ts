import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getBaseUrl, sendPasswordResetEmail } from '@/server/email'
import { checkRateLimit, mustHaveRateLimit, resetLimit } from '@/server/lib/rate-limit'

const forgotSchema = z.object({
	email: z.string().email(),
})

const limiter = mustHaveRateLimit(resetLimit, 'forgot-password')

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const rateResult = await checkRateLimit(limiter, ip, true)
		if (!rateResult.success) {
			const status = rateResult.serviceError ? 503 : 429
			const code = rateResult.serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED'
			return NextResponse.json(
				{ error: { code, message: 'Too many requests. Try again later.' } },
				{ status },
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
			.select({ id: users.id, authProvider: users.authProvider })
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		if (!user || user.authProvider === 'google') {
			await new Promise((resolve) => setTimeout(resolve, 150))
			return NextResponse.json({ success: true })
		}

		const resetToken = nanoid(32)
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

		await db
			.update(users)
			.set({
				resetToken,
				resetTokenExpiresAt: expiresAt,
			})
			.where(eq(users.email, email))

		try {
			await sendPasswordResetEmail(email, resetToken, getBaseUrl())
		} catch (err) {
			console.error('Password reset email failed:', err instanceof Error ? err.message : 'Unknown')
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Forgot password error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Request failed' } },
			{ status: 500 },
		)
	}
}
