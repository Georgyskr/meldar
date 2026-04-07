import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

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

const { POST } = await import('../route')
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
