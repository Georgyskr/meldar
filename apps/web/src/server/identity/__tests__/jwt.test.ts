import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserFromRequest, signToken, verifyToken } from '../jwt'

const TEST_SECRET = 'test-secret-key-for-jwt-signing!'

describe('JWT utilities', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', TEST_SECRET)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe('signToken', () => {
		it('returns a valid JWT string', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440000',
				email: 'test@example.com',
				emailVerified: false,
				tokenVersion: 0,
			})
			expect(typeof token).toBe('string')
			expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
		})
	})

	describe('verifyToken', () => {
		it('verifies and returns payload for a valid token', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440000',
				email: 'test@example.com',
				emailVerified: false,
				tokenVersion: 0,
			})
			const payload = verifyToken(token)
			expect(payload).not.toBeNull()
			expect(payload?.userId).toBe('550e8400-e29b-41d4-a716-446655440000')
			expect(payload?.email).toBe('test@example.com')
		})

		it('returns null for an invalid token', () => {
			const result = verifyToken('invalid.token.string')
			expect(result).toBeNull()
		})

		it('returns null for a tampered token', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440000',
				email: 'test@example.com',
				emailVerified: false,
				tokenVersion: 0,
			})
			// Tamper with the payload section
			const parts = token.split('.')
			parts[1] = `${parts[1]}tampered`
			const tampered = parts.join('.')
			const result = verifyToken(tampered)
			expect(result).toBeNull()
		})

		it('returns null for an expired token', () => {
			// Create a token that is already expired
			const token = jwt.sign(
				{ userId: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' },
				TEST_SECRET,
				{
					expiresIn: '-1s',
				},
			)
			const result = verifyToken(token)
			expect(result).toBeNull()
		})

		it('returns null for a token signed with a different secret', () => {
			const token = jwt.sign(
				{ userId: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' },
				'different-secret',
				{ expiresIn: '7d' },
			)
			const result = verifyToken(token)
			expect(result).toBeNull()
		})

		it('rejects tokens missing required claims (strict payload validation)', () => {
			// Post-Zod: every claim is required. A token without emailVerified or
			// tokenVersion can't be trusted to describe a valid session.
			const token = jwt.sign(
				{ userId: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' },
				TEST_SECRET,
				{ expiresIn: '7d', algorithm: 'HS256' },
			)
			expect(verifyToken(token)).toBeNull()
		})

		it('rejects tokens with a non-UUID userId', () => {
			const token = jwt.sign(
				{
					userId: 'user-123',
					email: 'test@example.com',
					emailVerified: true,
					tokenVersion: 0,
				},
				TEST_SECRET,
				{ expiresIn: '7d', algorithm: 'HS256' },
			)
			expect(verifyToken(token)).toBeNull()
		})

		it('rejects tokens with a non-email email field', () => {
			const token = jwt.sign(
				{
					userId: '550e8400-e29b-41d4-a716-446655440000',
					email: 'not-an-email',
					emailVerified: true,
					tokenVersion: 0,
				},
				TEST_SECRET,
				{ expiresIn: '7d', algorithm: 'HS256' },
			)
			expect(verifyToken(token)).toBeNull()
		})

		it('rejects tokens with negative tokenVersion', () => {
			const token = jwt.sign(
				{
					userId: '550e8400-e29b-41d4-a716-446655440000',
					email: 'test@example.com',
					emailVerified: true,
					tokenVersion: -1,
				},
				TEST_SECRET,
				{ expiresIn: '7d', algorithm: 'HS256' },
			)
			expect(verifyToken(token)).toBeNull()
		})

		it('preserves emailVerified: true through sign/verify roundtrip', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440000',
				email: 'test@example.com',
				emailVerified: true,
				tokenVersion: 0,
			})
			const payload = verifyToken(token)
			expect(payload?.emailVerified).toBe(true)
		})

		it('rejects tokens signed with a different algorithm (CWE-347 alg-confusion)', () => {
			// We sign tokens with HS256. A verifier that doesn't pin its
			// algorithm list will happily accept HS512 (or worse, RS256 with
			// the public key reused as an HMAC secret). Reject anything that
			// is not HS256.
			const token = jwt.sign(
				{ userId: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' },
				TEST_SECRET,
				{
					expiresIn: '7d',
					algorithm: 'HS512',
				},
			)
			const result = verifyToken(token)
			expect(result).toBeNull()
		})
	})

	describe('getUserFromRequest', () => {
		function makeRequest(cookieHeader?: string): Request {
			const headers = new Headers()
			if (cookieHeader) {
				headers.set('cookie', cookieHeader)
			}
			return new Request('http://localhost/api/auth/me', { headers })
		}

		it('returns payload for valid meldar-auth cookie', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440001',
				email: 'user@test.com',
				emailVerified: true,
				tokenVersion: 0,
			})
			const request = makeRequest(`meldar-auth=${token}`)
			const result = getUserFromRequest(request)
			expect(result).not.toBeNull()
			expect(result?.userId).toBe('550e8400-e29b-41d4-a716-446655440001')
			expect(result?.email).toBe('user@test.com')
		})

		it('returns null when no cookie header present', () => {
			const request = makeRequest()
			const result = getUserFromRequest(request)
			expect(result).toBeNull()
		})

		it('returns null when cookie header has no meldar-auth', () => {
			const request = makeRequest('other-cookie=value; another=123')
			const result = getUserFromRequest(request)
			expect(result).toBeNull()
		})

		it('returns null when meldar-auth cookie has tampered value', () => {
			const request = makeRequest('meldar-auth=this-is-not-a-valid-jwt')
			const result = getUserFromRequest(request)
			expect(result).toBeNull()
		})

		it('extracts token from cookie with multiple cookies', () => {
			const token = signToken({
				userId: '550e8400-e29b-41d4-a716-446655440002',
				email: 'multi@test.com',
				emailVerified: false,
				tokenVersion: 0,
			})
			const request = makeRequest(`other=abc; meldar-auth=${token}; session=xyz`)
			const result = getUserFromRequest(request)
			expect(result).not.toBeNull()
			expect(result?.userId).toBe('550e8400-e29b-41d4-a716-446655440002')
		})
	})

	describe('getSecret', () => {
		it('throws if AUTH_SECRET is not set', () => {
			vi.stubEnv('AUTH_SECRET', '')
			expect(() =>
				signToken({ userId: 'u', email: 'e', emailVerified: false, tokenVersion: 0 }),
			).toThrow('AUTH_SECRET is not set')
		})

		it('throws if AUTH_SECRET is shorter than 32 characters', () => {
			vi.stubEnv('AUTH_SECRET', 'only-31-chars-xxxxxxxxxxxxxxxxxxx'.slice(0, 31))
			expect(() =>
				signToken({ userId: 'u', email: 'e', emailVerified: false, tokenVersion: 0 }),
			).toThrow('AUTH_SECRET must be at least 32 characters')
		})

		it('accepts AUTH_SECRET that is exactly 32 characters', () => {
			vi.stubEnv('AUTH_SECRET', 'exactly-32-chars-xxxxxxxxxxxxxxx')
			expect(() =>
				signToken({ userId: 'u', email: 'e', emailVerified: false, tokenVersion: 0 }),
			).not.toThrow()
		})
	})
})
