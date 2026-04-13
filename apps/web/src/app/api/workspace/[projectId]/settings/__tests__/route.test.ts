import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

const { mockDbSelect, mockDbUpdate } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	projects: {
		id: 'id',
		userId: 'user_id',
		deletedAt: 'deleted_at',
		wishes: 'wishes',
		updatedAt: 'updated_at',
	},
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
}))

const { GET, PUT } = await import('../route')

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'

const routeContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

function makeGetRequest(cookie?: string): NextRequest {
	const headers = new Headers()
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/settings`, {
		method: 'GET',
		headers,
	})
}

function makePutRequest(body: unknown, cookie?: string): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/settings`, {
		method: 'PUT',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

function setupDbMocks(existingWishes: Record<string, unknown> | null = null) {
	mockVerifyProjectOwnership.mockResolvedValue({ id: PROJECT_ID, name: 'My project' })

	mockDbSelect.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue([{ wishes: existingWishes }]),
			}),
		}),
	})

	let savedWishes: Record<string, unknown> = {}
	mockDbUpdate.mockReturnValue({
		set: vi.fn().mockImplementation((data: { wishes: Record<string, unknown> }) => {
			savedWishes = data.wishes
			return {
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ wishes: savedWishes }]),
				}),
			}
		}),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyProjectOwnership.mockResolvedValue({ id: PROJECT_ID, name: 'My project' })
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('GET /api/workspace/[projectId]/settings', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeGetRequest(), routeContext)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await GET(makeGetRequest('bogus'), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns current wishes for the project', async () => {
		const wishes = { businessName: 'Cool Salon', services: ['Haircut', 'Color'] }
		setupDbMocks(wishes)

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings).toEqual(wishes)
	})

	it('returns empty object when wishes is null', async () => {
		setupDbMocks(null)

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings).toEqual({})
	})

	it('returns 500 when db query throws', async () => {
		mockDbSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockRejectedValue(new Error('db down')),
				}),
			}),
		})

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})

describe('PUT /api/workspace/[projectId]/settings', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await PUT(makePutRequest({ businessName: 'New Name' }), routeContext)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await PUT(makePutRequest({ businessName: 'New Name' }, 'bogus'), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await PUT(makePutRequest({ businessName: 'New Name' }, 'valid_token'), routeContext)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns 400 on invalid JSON', async () => {
		const res = await PUT(makePutRequest('not json{', 'valid_token'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('updates businessName in wishes', async () => {
		setupDbMocks({ services: [{ name: 'Haircut' }] })

		const res = await PUT(
			makePutRequest({ businessName: 'New Salon' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings.businessName).toBe('New Salon')
		expect(json.settings.services).toEqual([{ name: 'Haircut' }])
	})

	it('updates services in wishes', async () => {
		setupDbMocks({ businessName: 'Cool Salon' })

		const res = await PUT(
			makePutRequest(
				{ services: [{ name: 'Haircut' }, { name: 'Color' }, { name: 'Blowout' }] },
				'valid_token',
			),
			routeContext,
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings.services).toEqual([
			{ name: 'Haircut' },
			{ name: 'Color' },
			{ name: 'Blowout' },
		])
		expect(json.settings.businessName).toBe('Cool Salon')
	})

	it('updates hours in wishes', async () => {
		setupDbMocks({})

		const hours = { mon: '09:00-17:00', tue: '09:00-17:00' }
		const res = await PUT(makePutRequest({ hours }, 'valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings.hours).toEqual(hours)
	})

	it('merges with existing wishes (does not clobber)', async () => {
		setupDbMocks({ businessName: 'Old Name', services: [{ name: 'Haircut' }] })

		const res = await PUT(makePutRequest({ businessName: 'New Name' }, 'valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { settings: Record<string, unknown> }
		expect(json.settings.businessName).toBe('New Name')
		expect(json.settings.services).toEqual([{ name: 'Haircut' }])
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const badContext = { params: Promise.resolve({ projectId: 'not-a-uuid' }) }
		const res = await PUT(makePutRequest({ businessName: 'New Name' }, 'valid_token'), badContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 500 when db update throws', async () => {
		setupDbMocks({})
		mockDbUpdate.mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(new Error('db down')),
				}),
			}),
		})

		const res = await PUT(makePutRequest({ businessName: 'New Name' }, 'valid_token'), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
