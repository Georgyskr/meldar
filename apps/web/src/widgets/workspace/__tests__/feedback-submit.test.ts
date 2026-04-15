import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/require-auth', () => ({
	requireAuth: vi.fn(async () => ({
		ok: true,
		userId: 'user_1',
		email: 'u@x.com',
		emailVerified: true,
	})),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: vi.fn(async () => ({ id: 'fake_project', name: 'Test' })),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: async () => ({ success: true }),
	mustHaveRateLimit: <T>(l: T) => l,
	workspaceBuildLimit: null,
}))

vi.mock('@/server/build/run-build', () => ({
	runBuildForUser: vi.fn(async () => ({ ok: true, stream: new ReadableStream() })),
}))

vi.mock('@/server/lib/pipeline-lock', () => ({
	isPipelineActive: vi.fn().mockResolvedValue(false),
	acquirePipelineLock: vi.fn(),
	releasePipelineLock: vi.fn(),
}))

const { POST } = await import('@/app/api/workspace/[projectId]/build/route')

function makeRequest(body: unknown): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	headers.set('cookie', 'meldar-auth=valid_token')
	return {
		request: new NextRequest(
			'http://localhost/api/workspace/00000000-0000-4000-8000-000000000001/build',
			{
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			},
		),
		context: { params: Promise.resolve({ projectId: '00000000-0000-4000-8000-000000000001' }) },
	}
}

describe('build route accepts feedback bar payloads', () => {
	it('accepts prompt without kanbanCardId (the feedback bar case)', async () => {
		const { request, context } = makeRequest({ prompt: 'create a booking page' })
		const res = await POST(request, context)
		expect(res.status).toBe(200)
	})

	it('accepts prompt with valid UUID kanbanCardId', async () => {
		const { request, context } = makeRequest({
			prompt: 'add a hero',
			kanbanCardId: '00000000-0000-4000-8000-000000000002',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(200)
	})

	it('rejects non-UUID kanbanCardId like "feedback"', async () => {
		const { request, context } = makeRequest({
			prompt: 'add a hero',
			kanbanCardId: 'feedback',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('rejects empty prompt', async () => {
		const { request, context } = makeRequest({ prompt: '' })
		const res = await POST(request, context)
		expect(res.status).toBe(400)
	})

	it('rejects missing prompt', async () => {
		const { request, context } = makeRequest({})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
	})
})
