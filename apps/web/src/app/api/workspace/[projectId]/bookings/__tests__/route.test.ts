import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCheckRateLimit } = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	bookingPublicLimit: null,
	mustHaveRateLimit: () => null,
}))

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

const { mockProposeTask, mockGetTaskHistory } = vi.hoisted(() => ({
	mockProposeTask: vi.fn(),
	mockGetTaskHistory: vi.fn(),
}))

vi.mock('@/server/agents/agent-task-service', () => ({
	proposeTask: mockProposeTask,
	getTaskHistory: mockGetTaskHistory,
}))

const { mockDbSelect } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	projects: {
		id: 'id',
		userId: 'user_id',
		deletedAt: 'deleted_at',
		wishes: 'wishes',
		name: 'name',
	},
	agentTasks: {
		projectId: 'project_id',
		agentType: 'agent_type',
		proposedAt: 'proposed_at',
	},
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
	desc: vi.fn((a: unknown) => ({ desc: a })),
}))

const { GET, POST } = await import('../route')

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const TASK_ID = '660e8400-e29b-41d4-a716-446655440001'

const routeContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

function makeGetRequest(cookie?: string): NextRequest {
	const headers = new Headers()
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/bookings`, {
		method: 'GET',
		headers,
	})
}

function makePostRequest(body: unknown): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/bookings`, {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

function setupProjectLookup(wishes: Record<string, unknown> | null = null) {
	mockDbSelect.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue([{ wishes, name: 'Test Business' }]),
			}),
		}),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	mockCheckRateLimit.mockResolvedValue({ success: true })
	mockVerifyProjectOwnership.mockResolvedValue({ id: PROJECT_ID, name: 'Test Business' })
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('POST /api/workspace/[projectId]/bookings', () => {
	const validBody = {
		service: 'Haircut',
		date: '2026-04-15',
		time: '14:00',
		name: 'Jane Doe',
		email: 'jane@example.com',
	}

	it('creates a booking without auth (public endpoint)', async () => {
		setupProjectLookup({ businessName: 'Cool Salon' })
		mockProposeTask.mockResolvedValue({ id: TASK_ID, status: 'proposed' })

		const res = await POST(makePostRequest(validBody), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { success: boolean; bookingId: string }
		expect(json.success).toBe(true)
		expect(json.bookingId).toBe(TASK_ID)
	})

	it('includes business name from project wishes in task payload', async () => {
		setupProjectLookup({ businessName: 'Cool Salon' })
		mockProposeTask.mockResolvedValue({ id: TASK_ID, status: 'proposed' })

		await POST(makePostRequest(validBody), routeContext)
		expect(mockProposeTask).toHaveBeenCalledWith(PROJECT_ID, 'booking_confirmation', {
			...validBody,
			businessName: 'Cool Salon',
		})
	})

	it('falls back to project name when wishes has no businessName', async () => {
		setupProjectLookup(null)
		mockProposeTask.mockResolvedValue({ id: TASK_ID, status: 'proposed' })

		await POST(makePostRequest(validBody), routeContext)
		expect(mockProposeTask).toHaveBeenCalledWith(PROJECT_ID, 'booking_confirmation', {
			...validBody,
			businessName: 'Test Business',
		})
	})

	it('accepts an optional note field', async () => {
		setupProjectLookup({ businessName: 'Cool Salon' })
		mockProposeTask.mockResolvedValue({ id: TASK_ID, status: 'proposed' })

		const bodyWithNote = { ...validBody, note: 'First time visitor' }
		const res = await POST(makePostRequest(bodyWithNote), routeContext)
		expect(res.status).toBe(200)
		expect(mockProposeTask).toHaveBeenCalledWith(PROJECT_ID, 'booking_confirmation', {
			...bodyWithNote,
			businessName: 'Cool Salon',
		})
	})

	it('returns 400 when required fields are missing', async () => {
		const res = await POST(makePostRequest({ service: 'Haircut' }), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when email is invalid', async () => {
		const res = await POST(makePostRequest({ ...validBody, email: 'not-an-email' }), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 on invalid JSON', async () => {
		const res = await POST(makePostRequest('not json{'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const badContext = { params: Promise.resolve({ projectId: 'not-a-uuid' }) }
		const res = await POST(makePostRequest(validBody), badContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 500 when proposeTask throws', async () => {
		setupProjectLookup({ businessName: 'Cool Salon' })
		mockProposeTask.mockRejectedValue(new Error('db down'))

		const res = await POST(makePostRequest(validBody), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})

	describe('rate limiting', () => {
		it('returns 429 when rate limited', async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false })

			const res = await POST(makePostRequest(validBody), routeContext)
			expect(res.status).toBe(429)
			const json = (await res.json()) as { error: { code: string } }
			expect(json.error.code).toBe('RATE_LIMITED')
		})
	})
})

describe('GET /api/workspace/[projectId]/bookings', () => {
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

	it('returns recent bookings for the project', async () => {
		const fakeBookings = [
			{
				id: TASK_ID,
				projectId: PROJECT_ID,
				agentType: 'booking_confirmation',
				status: 'proposed',
				payload: { service: 'Haircut' },
			},
		]
		mockGetTaskHistory.mockResolvedValue(fakeBookings)

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { bookings: unknown[] }
		expect(json.bookings).toEqual(fakeBookings)
		expect(mockGetTaskHistory).toHaveBeenCalledWith(PROJECT_ID, 50)
	})

	it('returns an empty list when there are no bookings', async () => {
		mockGetTaskHistory.mockResolvedValue([])

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { bookings: unknown[] }
		expect(json.bookings).toEqual([])
	})

	it('returns 500 when getTaskHistory throws', async () => {
		mockGetTaskHistory.mockRejectedValue(new Error('db down'))

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
