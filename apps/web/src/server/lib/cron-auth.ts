import { timingSafeEqual } from 'node:crypto'

export function verifyCronAuth(request: Request): boolean {
	const secret = process.env.CRON_SECRET
	if (!secret || secret.length < 16) return false

	const authHeader = request.headers.get('authorization')
	if (!authHeader) return false

	const expected = `Bearer ${secret}`

	const maxLen = Math.max(authHeader.length, expected.length)
	const a = Buffer.alloc(maxLen)
	const b = Buffer.alloc(maxLen)
	Buffer.from(authHeader).copy(a)
	Buffer.from(expected).copy(b)

	return authHeader.length === expected.length && timingSafeEqual(a, b)
}
