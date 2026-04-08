import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { and, eq, gt, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/server/identity/password'
import { checkRateLimit, mustHaveRateLimit, resetLimit } from '@/server/lib/rate-limit'

const resetSchema = z.object({
	token: z.string().min(1),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

const limiter = mustHaveRateLimit(resetLimit, 'reset-password')

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
		const parsed = resetSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { token, password } = parsed.data
		const db = getDb()

		const [user] = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(and(eq(users.resetToken, token), gt(users.resetTokenExpiresAt, new Date())))
			.limit(1)

		if (!user) {
			return NextResponse.json(
				{ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired reset link' } },
				{ status: 401 },
			)
		}

		const passwordHash = await hashPassword(password)

		await db
			.update(users)
			.set({
				passwordHash,
				resetToken: null,
				resetTokenExpiresAt: null,
				tokenVersion: sql`token_version + 1`,
			})
			.where(eq(users.id, user.id))

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Reset password error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Reset failed' } },
			{ status: 500 },
		)
	}
}
