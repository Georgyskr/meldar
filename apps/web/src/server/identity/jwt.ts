import jwt from 'jsonwebtoken'

type TokenPayload = {
	userId: string
	email: string
}

/**
 * Single source of truth for the JWT signing/verification algorithm.
 *
 * Pinned to HS256 because we use a shared HMAC secret. Without an explicit
 * `algorithms` allowlist on `verify()`, jsonwebtoken happily accepts ANY
 * supported algorithm — including the classic RS256-with-public-key-as-HMAC
 * confusion attack (CWE-347). Even within the HMAC family, accepting both
 * HS256 and HS512 lets an attacker downgrade or forge tokens.
 */
const JWT_ALGORITHM = 'HS256' as const

function getSecret(): string {
	const secret = process.env.AUTH_SECRET
	if (!secret) throw new Error('AUTH_SECRET is not set')
	return secret
}

export function signToken(payload: TokenPayload): string {
	return jwt.sign(payload, getSecret(), {
		expiresIn: '7d',
		algorithm: JWT_ALGORITHM,
	})
}

export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, getSecret(), {
			algorithms: [JWT_ALGORITHM],
		}) as TokenPayload
	} catch {
		return null
	}
}

export function getUserFromRequest(request: Request): TokenPayload | null {
	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null

	const match = cookieHeader.match(/meldar-auth=([^;]+)/)
	if (!match) return null

	return verifyToken(match[1])
}
