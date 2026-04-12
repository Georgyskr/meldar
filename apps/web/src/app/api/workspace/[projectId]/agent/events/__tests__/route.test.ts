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

const mockDb = {
	select: vi.fn(),
}

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockDb,
}))

vi.mock('@meldar/db/schema', () => ({
	agentEvents: {
		id: 'agent_events.id',
		projectId: 'agent_events.project_id',
		userId: 'agent_events.user_id',
		eventType: 'agent_events.event_type',
		payload: 'agent_events.payload',
		createdAt: 'agent_events.created_at',
	},
}))

vi.mock('drizzle-orm', () => ({
	desc: vi.fn((col: unknown) => ({ desc: col })),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
}))

const { GET } = await import('../route')

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'

const routeContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: '770e8400-e29b-41d4-a716-446655440001',
		projectId: PROJECT_ID,
		userId: 'user_1',
		eventType: 'proposal',
		payload: { taskId: 'task_1' },
		createdAt: '2026-04-10T12:00:00Z',
		...overrides,
	}
}

function makeGetRequest(opts: { cookie?: string; accept?: string } = {}): NextRequest {
	const headers = new Headers()
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	if (opts.accept) headers.set('accept', opts.accept)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/agent/events`, {
		method: 'GET',
		headers,
	})
}

function setupDbChain(events: unknown[]) {
	mockDb.select.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(events),
				}),
			}),
		}),
	})
}

function setupDbChainError(error: Error) {
	mockDb.select.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockRejectedValue(error),
				}),
			}),
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

describe('GET /api/workspace/[projectId]/agent/events (JSON)', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeGetRequest(), routeContext)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await GET(makeGetRequest({ cookie: 'bogus' }), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await GET(makeGetRequest({ cookie: 'valid_token' }), routeContext)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns events ordered by createdAt DESC', async () => {
		const events = [
			makeEvent({ id: 'evt-2', createdAt: '2026-04-10T13:00:00Z' }),
			makeEvent({ id: 'evt-1', createdAt: '2026-04-10T12:00:00Z' }),
		]
		setupDbChain(events)

		const res = await GET(makeGetRequest({ cookie: 'valid_token' }), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { events: unknown[] }
		expect(json.events).toHaveLength(2)
		expect(json.events).toEqual(events)
	})

	it('returns an empty list when there are no events', async () => {
		setupDbChain([])

		const res = await GET(makeGetRequest({ cookie: 'valid_token' }), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { events: unknown[] }
		expect(json.events).toEqual([])
	})

	it('returns 500 when the query throws', async () => {
		setupDbChainError(new Error('db down'))

		const res = await GET(makeGetRequest({ cookie: 'valid_token' }), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})

describe('GET /api/workspace/[projectId]/agent/events (SSE)', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeGetRequest({ accept: 'text/event-stream' }), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await GET(
			makeGetRequest({ cookie: 'valid_token', accept: 'text/event-stream' }),
			routeContext,
		)
		expect(res.status).toBe(404)
	})

	it('returns SSE stream with correct content type', async () => {
		const events = [makeEvent()]
		setupDbChain(events)

		const res = await GET(
			makeGetRequest({ cookie: 'valid_token', accept: 'text/event-stream' }),
			routeContext,
		)
		expect(res.headers.get('Content-Type')).toBe('text/event-stream')
		expect(res.headers.get('Cache-Control')).toBe('no-cache')
	})

	it('streams events as SSE data lines', async () => {
		const events = [
			makeEvent({ id: 'evt-1', eventType: 'proposal' }),
			makeEvent({ id: 'evt-2', eventType: 'approval' }),
		]
		setupDbChain(events)

		const res = await GET(
			makeGetRequest({ cookie: 'valid_token', accept: 'text/event-stream' }),
			routeContext,
		)

		const text = await res.text()
		const lines = text.split('\n\n').filter(Boolean)
		expect(lines).toHaveLength(2)
		expect(lines[0]).toMatch(/^data: /)
		const parsed = JSON.parse(lines[0].replace('data: ', '')) as { id: string }
		expect(parsed.id).toBe('evt-1')
	})

	it('returns an empty stream when there are no events', async () => {
		setupDbChain([])

		const res = await GET(
			makeGetRequest({ cookie: 'valid_token', accept: 'text/event-stream' }),
			routeContext,
		)
		const text = await res.text()
		expect(text).toBe('')
	})

	it('returns 500 when the SSE query throws', async () => {
		setupDbChainError(new Error('db down'))

		const res = await GET(
			makeGetRequest({ cookie: 'valid_token', accept: 'text/event-stream' }),
			routeContext,
		)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
