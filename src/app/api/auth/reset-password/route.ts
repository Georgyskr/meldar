import { and, eq, gt } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { hashPassword } from '@/server/identity/password'

const resetSchema = z.object({
	token: z.string().min(1),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
	try {
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
