import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signToken } from '../server/identity/jwt'

const TEST_SECRET = 'test-secret-for-middleware'

describe('workspace auth middleware', () => {
	beforeEach(() => {
		vi.stubEnv('AUTH_SECRET', TEST_SECRET)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	async function runMiddleware(path: string, cookie?: string) {
		const { middleware } = await import('../middleware')
		const url = `http://localhost:3000${path}`
		const headers = new Headers()
		if (cookie) headers.set('cookie', cookie)

		const request = new Request(url, { headers })
		Object.defineProperty(request, 'nextUrl', {
			value: new URL(url),
		})

		return middleware(request as never)
	}

	it('rejects unauthenticated requests to /api/workspace with 401', async () => {
		const response = await runMiddleware('/api/workspace/projects')
		expect(response).toBeDefined()
		expect(response?.status).toBe(401)
		const body = await response?.json()
		expect(body.error.code).toBe('UNAUTHENTICATED')
	})

	it('rejects requests with invalid token to /api/workspace with 401', async () => {
		const response = await runMiddleware('/api/workspace/projects', 'meldar-auth=invalid-token')
		expect(response).toBeDefined()
		expect(response?.status).toBe(401)
	})

	it('allows authenticated requests to /api/workspace', async () => {
		const token = signToken({
			userId: 'user-123',
			email: 'test@test.com',
			emailVerified: true,
			tokenVersion: 0,
		})
		const response = await runMiddleware('/api/workspace/projects', `meldar-auth=${token}`)
		expect(response).toBeDefined()
		expect(response?.status).not.toBe(401)
	})

	it('does not intercept non-workspace API routes', async () => {
		const response = await runMiddleware('/api/auth/login')
		expect(response).toBeUndefined()
	})

	it('does not intercept public pages', async () => {
		const response = await runMiddleware('/')
		expect(response).toBeUndefined()
	})
})
