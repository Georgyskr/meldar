import { getDb } from '@meldar/db/client'
import { tokenTransactions, users } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/server/email'
import { setAuthCookie } from '@/server/identity/auth-cookie'
import { signToken } from '@/server/identity/jwt'
import { hashPassword } from '@/server/identity/password'
import { checkRateLimit, googleCallbackLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

const limiter = mustHaveRateLimit(googleCallbackLimit, 'google-callback')

function errorRedirect(baseUrl: string, error: string): NextResponse {
	const response = NextResponse.redirect(`${baseUrl}/sign-in?error=${error}`)
	response.cookies.delete('oauth_state')
	return response
}

export async function GET(request: NextRequest) {
	const baseUrl = getBaseUrl()

	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const rateResult = await checkRateLimit(limiter, ip)
		if (!rateResult.success) {
			return errorRedirect(baseUrl, 'rate-limited')
		}

		const code = request.nextUrl.searchParams.get('code')
		const error = request.nextUrl.searchParams.get('error')
		const state = request.nextUrl.searchParams.get('state')

		if (error || !code) {
			return errorRedirect(baseUrl, 'google-auth-failed')
		}

		const cookieStore = await cookies()
		const storedState = cookieStore.get('oauth_state')?.value

		if (!state || !storedState || state !== storedState) {
			return errorRedirect(baseUrl, 'google-auth-failed')
		}

		const clientId = process.env.GOOGLE_CLIENT_ID
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET
		if (!clientId || !clientSecret) {
			return errorRedirect(baseUrl, 'google-auth-failed')
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
			return errorRedirect(baseUrl, 'google-token-exchange-failed')
		}

		const tokens = await tokenResponse.json()

		const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		})

		if (!userInfoResponse.ok) {
			return errorRedirect(baseUrl, 'google-userinfo-failed')
		}

		const googleUser = await userInfoResponse.json()
		const email: string | undefined = googleUser.email
		const emailVerified: boolean = googleUser.verified_email === true

		if (!email) {
			return errorRedirect(baseUrl, 'google-no-email')
		}

		if (!emailVerified) {
			return errorRedirect(baseUrl, 'google-email-not-verified')
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
		let isNewUser = false

		if (existingUser) {
			if (existingUser.authProvider !== 'google') {
				return errorRedirect(baseUrl, 'google-account-exists')
			}
			userId = existingUser.id
			tokenVersion = existingUser.tokenVersion
			if (!existingUser.emailVerified) {
				await db.update(users).set({ emailVerified: true }).where(eq(users.id, existingUser.id))
			}
		} else {
			isNewUser = true
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

		const response = NextResponse.redirect(`${baseUrl}${isNewUser ? '/onboarding' : '/workspace'}`)
		setAuthCookie(response, token)
		response.cookies.delete('oauth_state')

		return response
	} catch (err) {
		console.error('Google OAuth callback error:', err instanceof Error ? err.message : 'Unknown')
		return errorRedirect(baseUrl, 'google-auth-failed')
	}
}
