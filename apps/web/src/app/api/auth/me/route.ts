import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/server/identity/jwt'
import { meLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'

const limiter = mustHaveRateLimit(meLimit, 'me')

export async function GET(request: NextRequest) {
	const tokenPayload = getUserFromRequest(request)

	if (!tokenPayload) {
		return NextResponse.json({ user: null })
	}

	if (limiter) {
		const { success } = await limiter.limit(tokenPayload.userId)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
				{ status: 429 },
			)
		}
	}

	const db = getDb()
	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
		})
		.from(users)
		.where(eq(users.id, tokenPayload.userId))
		.limit(1)

	if (!user) {
		const response = NextResponse.json({ user: null })
		response.cookies.delete('meldar-auth')
		return response
	}

	return NextResponse.json({ user })
}

export async function DELETE(_request: NextRequest) {
	const response = NextResponse.json({ success: true })
	response.cookies.delete('meldar-auth')
	return response
}
