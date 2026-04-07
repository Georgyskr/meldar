import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/jwt', () => ({
	verifyToken: vi.fn((token: string) => {
		if (token === 'valid_token') return { userId: 'user_1', email: 'u@x.com' }
		return null
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

const { mockListUserProjects } = vi.hoisted(() => ({
	mockListUserProjects: vi.fn(),
}))

vi.mock('@/server/projects/list-user-projects', () => ({
	listUserProjects: (...args: unknown[]) => mockListUserProjects(...args),
}))

const { POST, GET } = await import('../route')
const { buildProjectStorageFromEnv } = await import('@meldar/storage')
const storage = buildProjectStorageFromEnv()

function makeRequest(opts: { body: unknown; cookie?: string }): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	return new NextRequest('http://localhost/api/workspace/projects', {
		method: 'POST',
		headers,
		body: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
	})
}

describe('POST /api/workspace/projects', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await POST(makeRequest({ body: { name: 'X' } }))
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await POST(makeRequest({ body: { name: 'X' }, cookie: 'bogus' }))
		expect(res.status).toBe(401)
	})

	it('returns 400 on invalid JSON', async () => {
		const res = await POST(makeRequest({ body: 'not json{', cookie: 'valid_token' }))
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when name has the wrong type', async () => {
		const res = await POST(makeRequest({ body: { name: 123 }, cookie: 'valid_token' }))
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when name exceeds the length cap', async () => {
		const res = await POST(makeRequest({ body: { name: 'x'.repeat(81) }, cookie: 'valid_token' }))
		expect(res.status).toBe(400)
	})

	it('returns 400 when name contains forbidden characters', async () => {
		const res = await POST(makeRequest({ body: { name: '<script>' }, cookie: 'valid_token' }))
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('creates a project with the given name and returns its id', async () => {
		const res = await POST(makeRequest({ body: { name: 'A new build' }, cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as { projectId: string }
		expect(json.projectId).toMatch(/[0-9a-f-]{36}/)

		const project = await storage.getProject(json.projectId, 'user_1')
		expect(project.name).toBe('A new build')
		expect(project.tier).toBe('builder')
	})

	it('uses a default name when none is provided', async () => {
		const res = await POST(makeRequest({ body: {}, cookie: 'valid_token' }))
		expect(res.status).toBe(200)
		const json = (await res.json()) as { projectId: string }
		const project = await storage.getProject(json.projectId, 'user_1')
		expect(project.name).toBeTruthy()
	})

	it('seeds the project with a stub README so it has at least one file', async () => {
		const res = await POST(makeRequest({ body: { name: 'With seed' }, cookie: 'valid_token' }))
		const json = (await res.json()) as { projectId: string }
		const files = await storage.getCurrentFiles(json.projectId)
		expect(files.length).toBeGreaterThanOrEqual(1)
		expect(files.some((f) => f.path === 'README.md')).toBe(true)
	})
})

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
