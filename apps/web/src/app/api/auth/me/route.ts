import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/server/identity/require-auth'
import { checkRateLimit, meLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'

const limiter = mustHaveRateLimit(meLimit, 'me')

export async function GET(request: NextRequest) {
	const auth = await requireAuth(request)

	if (!auth.ok) {
		return NextResponse.json({ user: null })
	}

	const { success } = await checkRateLimit(limiter, auth.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
			{ status: 429 },
		)
	}

	const db = getDb()
	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
		})
		.from(users)
		.where(eq(users.id, auth.userId))
		.limit(1)

	if (!user) {
		const response = NextResponse.json({ user: null })
		response.cookies.delete('meldar-auth')
		return response
	}

	return NextResponse.json({ user })
}

export async function DELETE(request: NextRequest) {
	const auth = await requireAuth(request)
	if (!auth.ok) {
		return auth.response
	}

	const db = getDb()
	await db
		.update(users)
		.set({ tokenVersion: sql`token_version + 1` })
		.where(eq(users.id, auth.userId))

	const response = NextResponse.json({ success: true })
	response.cookies.delete('meldar-auth')
	return response
}
