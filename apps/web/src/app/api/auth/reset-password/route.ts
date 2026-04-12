import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { and, eq, gt, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/server/identity/password'
import { hashToken } from '@/server/identity/token-hash'
import { checkRateLimit, mustHaveRateLimit, resetPasswordLimit } from '@/server/lib/rate-limit'

const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.refine((p) => /[a-z]/.test(p), 'Password must contain a lowercase letter')
	.refine((p) => /[A-Z]/.test(p), 'Password must contain an uppercase letter')
	.refine((p) => /[0-9]/.test(p), 'Password must contain a digit')

const resetSchema = z.object({
	token: z.string().min(1),
	password: passwordSchema,
})

const limiter = mustHaveRateLimit(resetPasswordLimit, 'reset-password')

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

		let body: unknown
		try {
			body = await request.json()
		} catch {
			return NextResponse.json(
				{ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
				{ status: 400 },
			)
		}

		const parsed = resetSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { token, password } = parsed.data
		const db = getDb()
		const passwordHash = await hashPassword(password)
		const tokenHash = hashToken(token)

		const [updated] = await db
			.update(users)
			.set({
				passwordHash,
				resetToken: null,
				resetTokenExpiresAt: null,
				tokenVersion: sql`token_version + 1`,
			})
			.where(and(eq(users.resetToken, tokenHash), gt(users.resetTokenExpiresAt, new Date())))
			.returning({ id: users.id })

		if (!updated) {
			return NextResponse.json(
				{ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired reset link' } },
				{ status: 401 },
			)
		}

		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('Reset password error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Reset failed' } },
			{ status: 500 },
		)
	}
}
