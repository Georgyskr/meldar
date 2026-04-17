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

const { mockListUserProjects } = vi.hoisted(() => ({
	mockListUserProjects: vi.fn(),
}))

vi.mock('@/server/projects/list-user-projects', () => ({
	listUserProjects: (...args: unknown[]) => mockListUserProjects(...args),
}))

const { GET } = await import('../route')

function makeGetRequest(opts: { cookie?: string } = {}): NextRequest {
	const headers = new Headers()
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	return new NextRequest('http://localhost/api/workspace/projects', { method: 'GET', headers })
}

describe('GET /api/workspace/projects', () => {
	beforeEach(() => {
		mockListUserProjects.mockResolvedValue([])
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeGetRequest())
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await GET(makeGetRequest({ cookie: 'bogus' }))
		expect(res.status).toBe(401)
	})

	it('returns an empty list when the user has no projects', async () => {
		const res = await GET(makeGetRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as { projects: unknown[] }
		expect(json.projects).toEqual([])
	})

	it('returns the list of projects in the order the database returned them', async () => {
		const newer = new Date('2026-04-06T10:00:00Z')
		const older = new Date('2026-04-05T09:00:00Z')
		mockListUserProjects.mockResolvedValue([
			{
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'First',
				lastBuildAt: newer,
				previewUrl: null,
				createdAt: newer,
			},
			{
				id: '550e8400-e29b-41d4-a716-446655440001',
				name: 'Second',
				lastBuildAt: null,
				previewUrl: 'https://preview.example.com/abc',
				createdAt: older,
			},
		])

		const res = await GET(makeGetRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as {
			projects: Array<{
				id: string
				name: string
				lastBuildAt: string | null
				previewUrl: string | null
			}>
		}
		expect(json.projects).toHaveLength(2)
		expect(json.projects[0].name).toBe('First')
		expect(json.projects[0].lastBuildAt).toBe(newer.toISOString())
		expect(json.projects[1].name).toBe('Second')
		expect(json.projects[1].lastBuildAt).toBeNull()
		expect(json.projects[1].previewUrl).toBe('https://preview.example.com/abc')
	})

	it('returns 500 when the database query throws', async () => {
		mockListUserProjects.mockRejectedValueOnce(new Error('connection refused'))
		const res = await GET(makeGetRequest({ cookie: 'valid_token' }))
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})

	it('scopes the query to the authenticated user', async () => {
		await GET(makeGetRequest({ cookie: 'valid_token' }))
		expect(mockListUserProjects).toHaveBeenCalledWith('user_1')
	})
})
