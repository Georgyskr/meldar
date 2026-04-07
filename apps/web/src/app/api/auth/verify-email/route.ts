import { getDb } from '@meldar/db/client'
import { users } from '@meldar/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const token = request.nextUrl.searchParams.get('token')

	if (!token) {
		return NextResponse.redirect(new URL('/?error=invalid-token', request.url))
	}

	const db = getDb()

	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.verifyToken, token), gt(users.verifyTokenExpiresAt, new Date())))
		.limit(1)

	if (!user) {
		return NextResponse.redirect(new URL('/?error=invalid-token', request.url))
	}

	await db
		.update(users)
		.set({
			emailVerified: true,
			verifyToken: null,
			verifyTokenExpiresAt: null,
		})
		.where(eq(users.id, user.id))

	return NextResponse.redirect(new URL('/?verified=1', request.url))
}
