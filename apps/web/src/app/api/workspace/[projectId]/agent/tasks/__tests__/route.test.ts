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

const { mockGetPendingTasks, mockApproveTask, mockRejectTask } = vi.hoisted(() => ({
	mockGetPendingTasks: vi.fn(),
	mockApproveTask: vi.fn(),
	mockRejectTask: vi.fn(),
}))

vi.mock('@/server/agents/agent-task-service', async () => {
	const actual = await vi.importActual<typeof import('@/server/agents/agent-task-service')>(
		'@/server/agents/agent-task-service',
	)
	return {
		...actual,
		getPendingTasks: mockGetPendingTasks,
		approveTask: mockApproveTask,
		rejectTask: mockRejectTask,
	}
})

const { GET, POST } = await import('../route')
const { TaskNotFoundError, InvalidTaskTransitionError } = await import(
	'@/server/agents/agent-task-service'
)

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const TASK_ID = '660e8400-e29b-41d4-a716-446655440001'

const routeContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

function makeGetRequest(cookie?: string): NextRequest {
	const headers = new Headers()
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/agent/tasks`, {
		method: 'GET',
		headers,
	})
}

function makePostRequest(body: unknown, cookie?: string): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${PROJECT_ID}/agent/tasks`, {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	mockVerifyProjectOwnership.mockResolvedValue({ id: PROJECT_ID, name: 'My project' })
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('GET /api/workspace/[projectId]/agent/tasks', () => {
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

	it('returns pending tasks for the project', async () => {
		const fakeTasks = [
			{ id: TASK_ID, projectId: PROJECT_ID, status: 'proposed', payload: { action: 'send email' } },
		]
		mockGetPendingTasks.mockResolvedValue(fakeTasks)

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { tasks: unknown[] }
		expect(json.tasks).toEqual(fakeTasks)
		expect(mockGetPendingTasks).toHaveBeenCalledWith(PROJECT_ID)
	})

	it('returns an empty list when there are no pending tasks', async () => {
		mockGetPendingTasks.mockResolvedValue([])

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { tasks: unknown[] }
		expect(json.tasks).toEqual([])
	})

	it('returns 500 when getPendingTasks throws', async () => {
		mockGetPendingTasks.mockRejectedValue(new Error('db down'))

		const res = await GET(makeGetRequest('valid_token'), routeContext)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})

describe('POST /api/workspace/[projectId]/agent/tasks', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await POST(makePostRequest({ taskId: TASK_ID, action: 'approve' }), routeContext)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'bogus'),
			routeContext,
		)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns 400 on invalid JSON', async () => {
		const res = await POST(makePostRequest('not json{', 'valid_token'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when action is missing', async () => {
		const res = await POST(makePostRequest({ taskId: TASK_ID }, 'valid_token'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when action is invalid', async () => {
		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'delete' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when taskId is not a UUID', async () => {
		const res = await POST(
			makePostRequest({ taskId: 'not-uuid', action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('approves a task and returns the updated task', async () => {
		const approved = { id: TASK_ID, status: 'approved', projectId: PROJECT_ID }
		mockApproveTask.mockResolvedValue(approved)

		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { task: { id: string; status: string } }
		expect(json.task.status).toBe('approved')
		expect(mockApproveTask).toHaveBeenCalledWith(TASK_ID, 'user_1', PROJECT_ID)
	})

	it('rejects a task and returns the updated task', async () => {
		const rejected = { id: TASK_ID, status: 'rejected', projectId: PROJECT_ID }
		mockRejectTask.mockResolvedValue(rejected)

		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'reject' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { task: { id: string; status: string } }
		expect(json.task.status).toBe('rejected')
		expect(mockRejectTask).toHaveBeenCalledWith(TASK_ID, 'user_1', PROJECT_ID)
	})

	it('returns 404 when the task does not exist', async () => {
		mockApproveTask.mockRejectedValue(new TaskNotFoundError(TASK_ID))

		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns 409 when the task transition is invalid', async () => {
		mockApproveTask.mockRejectedValue(
			new InvalidTaskTransitionError(TASK_ID, 'approved', 'approved'),
		)

		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(409)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_TRANSITION')
	})

	it('returns 500 on unexpected errors', async () => {
		mockApproveTask.mockRejectedValue(new Error('unexpected'))

		const res = await POST(
			makePostRequest({ taskId: TASK_ID, action: 'approve' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INTERNAL_ERROR')
	})
})
