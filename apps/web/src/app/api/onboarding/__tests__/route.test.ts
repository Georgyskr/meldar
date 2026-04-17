import { NextRequest, NextResponse } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: vi.fn(async (request: Request) => {
		const cookie = request.headers.get('cookie')
		const match = cookie?.match(/meldar-auth=([^;]+)/)
		if (match?.[1] === 'valid_token') {
			return { ok: true, userId: 'user_1', email: 'u@x.com', emailVerified: true }
		}
		return {
			ok: false,
			response: NextResponse.json(
				{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
				{ status: 401 },
			),
		}
	}),
}))

vi.mock('@meldar/storage', async () => {
	const actual = await vi.importActual<typeof import('@meldar/storage')>('@meldar/storage')
	const blob = new actual.InMemoryBlobStorage()
	const storage = new actual.InMemoryProjectStorage(blob)
	return {
		...actual,
		buildProjectStorageFromEnv: () => storage,
	}
})

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: vi.fn(() => Promise.resolve({ success: true })),
	mustHaveRateLimit: vi.fn((limiter: unknown) => limiter),
	projectsCreateLimit: null,
}))

vi.mock('@/server/lib/insert-plan-cards', () => ({
	insertPlanCards: vi.fn(() => Promise.resolve([])),
	insertPersonalizationCard: vi.fn(() => Promise.resolve('card-1')),
}))

vi.mock('@meldar/sandbox', async () => {
	const actual = await vi.importActual<typeof import('@meldar/sandbox')>('@meldar/sandbox')
	return {
		...actual,
		CloudflareSandboxProvider: {
			fromEnv: () => ({
				writeFiles: vi.fn(() =>
					Promise.resolve({
						projectId: 'p',
						previewUrl: 'https://sandbox.test',
						status: 'ready',
					}),
				),
			}),
		},
	}
})

const { mockDbUpdate } = vi.hoisted(() => ({
	mockDbUpdate: vi.fn(() => ({
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(undefined),
	})),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({ update: mockDbUpdate }),
}))

vi.mock('@meldar/db/schema', () => ({
	projects: { id: 'id', wishes: 'wishes', updatedAt: 'updated_at' },
}))

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
}))

const { POST } = await import('../route')

function makeRequest(opts: { body: unknown; cookie?: string }): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	return new NextRequest('http://localhost/api/onboarding', {
		method: 'POST',
		headers,
		body: JSON.stringify(opts.body),
	})
}

describe('POST /api/onboarding', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('rejects unauthenticated requests with 401', async () => {
		const req = makeRequest({ body: { verticalId: 'hair-beauty' } })
		const res = await POST(req)
		expect(res.status).toBe(401)
	})

	it('rejects invalid vertical id with 400', async () => {
		const req = makeRequest({ body: { verticalId: 'nonexistent' }, cookie: 'valid_token' })
		const res = await POST(req)
		expect(res.status).toBe(400)
	})

	it('creates project with valid hair-beauty vertical', async () => {
		const req = makeRequest({ body: { verticalId: 'hair-beauty' }, cookie: 'valid_token' })
		const res = await POST(req)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.projectId).toBeDefined()
		expect(body.vertical.id).toBe('hair-beauty')
		expect(body.vertical.services).toHaveLength(3)
	})

	it('creates project with consulting vertical', async () => {
		const req = makeRequest({ body: { verticalId: 'consulting' }, cookie: 'valid_token' })
		const res = await POST(req)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.vertical.id).toBe('consulting')
	})

	it('accepts optional business name', async () => {
		const req = makeRequest({
			body: { verticalId: 'hair-beauty', businessName: "Elif's Studio" },
			cookie: 'valid_token',
		})
		const res = await POST(req)
		expect(res.status).toBe(200)
	})

	it('rejects missing body with 400', async () => {
		const headers = new Headers({ 'Content-Type': 'application/json' })
		headers.set('cookie', 'meldar-auth=valid_token')
		const req = new NextRequest('http://localhost/api/onboarding', {
			method: 'POST',
			headers,
			body: 'not json',
		})
		const res = await POST(req)
		expect(res.status).toBe(400)
	})

	it('persists verticalId and businessName to project.wishes for later duplication', async () => {
		mockDbUpdate.mockClear()
		const req = makeRequest({
			body: { verticalId: 'consulting', businessName: 'Acme Consulting' },
			cookie: 'valid_token',
		})
		const res = await POST(req)
		expect(res.status).toBe(200)

		expect(mockDbUpdate).toHaveBeenCalled()
		const setCall = mockDbUpdate.mock.results[0]?.value?.set as unknown as ReturnType<typeof vi.fn>
		expect(setCall).toHaveBeenCalledWith(
			expect.objectContaining({
				wishes: expect.objectContaining({
					verticalId: 'consulting',
					businessName: 'Acme Consulting',
				}),
			}),
		)
	})
})
