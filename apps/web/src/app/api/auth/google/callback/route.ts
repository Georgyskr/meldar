import { getDb } from '@meldar/db/client'
import { tokenTransactions, users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/server/email'
import { signToken } from '@/server/identity/jwt'
import { hashPassword } from '@/server/identity/password'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(request: NextRequest) {
	const baseUrl = getBaseUrl()

	try {
		const code = request.nextUrl.searchParams.get('code')
		const error = request.nextUrl.searchParams.get('error')
		const state = request.nextUrl.searchParams.get('state')

		if (error || !code) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-auth-failed`)
		}

		const cookieStore = await cookies()
		const storedState = cookieStore.get('oauth_state')?.value

		if (!state || !storedState || state !== storedState) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-auth-failed`)
		}

		const clientId = process.env.GOOGLE_CLIENT_ID
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET
		if (!clientId || !clientSecret) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-auth-failed`)
		}

		const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: `${baseUrl}/api/auth/google/callback`,
				grant_type: 'authorization_code',
			}),
		})

		if (!tokenResponse.ok) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-token-exchange-failed`)
		}

		const tokens = await tokenResponse.json()

		const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		})

		if (!userInfoResponse.ok) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-userinfo-failed`)
		}

		const googleUser = await userInfoResponse.json()
		const email: string | undefined = googleUser.email
		const emailVerified: boolean = googleUser.verified_email === true

		if (!email) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-no-email`)
		}

		if (!emailVerified) {
			return NextResponse.redirect(`${baseUrl}/sign-in?error=google-email-not-verified`)
		}

		const db = getDb()

		const [existingUser] = await db
			.select({
				id: users.id,
				emailVerified: users.emailVerified,
				authProvider: users.authProvider,
				tokenVersion: users.tokenVersion,
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		let userId: string
		let tokenVersion: number

		if (existingUser) {
			if (existingUser.authProvider !== 'google') {
				return NextResponse.redirect(`${baseUrl}/sign-in?error=google-account-exists`)
			}
			userId = existingUser.id
			tokenVersion = existingUser.tokenVersion
			if (!existingUser.emailVerified) {
				await db.update(users).set({ emailVerified: true }).where(eq(users.id, existingUser.id))
			}
		} else {
			const placeholderHash = await hashPassword(crypto.randomUUID())

			const [newUser] = await db
				.insert(users)
				.values({
					email,
					passwordHash: placeholderHash,
					name: googleUser.name || null,
					emailVerified: true,
					authProvider: 'google',
				})
				.returning({ id: users.id })
			userId = newUser.id
			tokenVersion = 0

			await db.insert(tokenTransactions).values({
				id: crypto.randomUUID(),
				userId,
				amount: 200,
				reason: 'signup_bonus',
				referenceId: null,
				balanceAfter: 200,
			})
		}

		const token = signToken({ userId, email, emailVerified: true, tokenVersion })

		const response = NextResponse.redirect(`${baseUrl}/workspace`)
		response.cookies.set('meldar-auth', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})
		response.cookies.delete('oauth_state')

		return response
	} catch (err) {
		console.error('Google OAuth callback error:', err instanceof Error ? err.message : 'Unknown')
		return NextResponse.redirect(`${baseUrl}/sign-in?error=google-auth-failed`)
	}
}
