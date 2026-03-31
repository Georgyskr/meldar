import jwt from 'jsonwebtoken'

type TokenPayload = {
	userId: string
	email: string
}

function getSecret(): string {
	const secret = process.env.AUTH_SECRET
	if (!secret) throw new Error('AUTH_SECRET is not set')
	return secret
}

export function signToken(payload: TokenPayload): string {
	return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, getSecret()) as TokenPayload
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
