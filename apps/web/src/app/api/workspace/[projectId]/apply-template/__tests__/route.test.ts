import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/jwt', () => ({
	verifyToken: vi.fn((token: string) => {
		if (token === 'valid_token') return { userId: 'user_1', email: 'u@x.com' }
		return null
	}),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	mustHaveRateLimit: (limiter: unknown, _name: string) => limiter,
	templateApplyLimit: null,
	checkRateLimit: async () => ({ success: true }),
}))

const { mockDbSelect, mockDbInsert, mockDbUpdate } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbInsert: vi.fn(),
	mockDbUpdate: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
		insert: mockDbInsert,
		update: mockDbUpdate,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	kanbanCards: {
		id: 'id',
		projectId: 'project_id',
		parentId: 'parent_id',
		position: 'position',
		state: 'state',
	},
	projects: { id: 'id', userId: 'user_id', deletedAt: 'deleted_at' },
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
	sql: vi.fn(() => 'sql_expr'),
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

const { POST } = await import('../route')

const VALID_PROJECT_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(opts: { body: unknown; cookie?: string; projectId?: string }): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const projectId = opts.projectId ?? VALID_PROJECT_ID
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/apply-template`, {
		method: 'POST',
		headers,
		body: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
	})
	return {
		request,
		context: { params: Promise.resolve({ projectId }) },
	}
}

function setupDbMocks() {
	mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })

	let selectCallCount = 0
	mockDbSelect.mockImplementation(() => {
		selectCallCount++
		if (selectCallCount === 1) {
			return {
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			}
		}
		return {
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([{ maxPosition: -1 }]),
			}),
		}
	})

	let cardId = 0
	mockDbInsert.mockReturnValue({
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockImplementation(() =>
				Promise.resolve([
					{
						id: `card-${++cardId}`,
						projectId: VALID_PROJECT_ID,
						title: 'template card',
						position: cardId,
					},
				]),
			),
		}),
	})

	mockDbUpdate.mockReturnValue({
		set: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue([]),
		}),
	})
}

describe('POST /api/workspace/[projectId]/apply-template', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when no auth cookie is present', async () => {
		const { request, context } = makeRequest({ body: { templateId: 'weight-tracker' } })
		const res = await POST(request, context)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const { request, context } = makeRequest({
			body: { templateId: 'weight-tracker' },
			cookie: 'bogus',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(401)
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const { request, context } = makeRequest({
			body: { templateId: 'weight-tracker' },
			cookie: 'valid_token',
			projectId: 'not-a-uuid',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 on invalid JSON body', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID })
		const { request, context } = makeRequest({
			body: 'not json{',
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when templateId is missing', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID })
		const { request, context } = makeRequest({
			body: {},
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 404 when project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const { request, context } = makeRequest({
			body: { templateId: 'weight-tracker' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
	})

	it('returns 404 when templateId does not match any template', async () => {
		setupDbMocks()
		const { request, context } = makeRequest({
			body: { templateId: 'nonexistent-template' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns 201 and inserts cards for a valid template', async () => {
		setupDbMocks()
		const { request, context } = makeRequest({
			body: { templateId: 'weight-tracker' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(201)

		const json = (await res.json()) as { cards: unknown[] }
		expect(json.cards).toBeDefined()
		expect(json.cards.length).toBeGreaterThan(0)
	})

	it('calls db.insert with kanbanCards table', async () => {
		setupDbMocks()
		const { request, context } = makeRequest({
			body: { templateId: 'expense-tracker' },
			cookie: 'valid_token',
		})
		await POST(request, context)

		expect(mockDbInsert).toHaveBeenCalled()
	})

	it('works with each template id', async () => {
		const { TEMPLATE_PLANS } = await import('@meldar/orchestrator')
		for (const template of TEMPLATE_PLANS) {
			vi.clearAllMocks()
			setupDbMocks()
			const { request, context } = makeRequest({
				body: { templateId: template.id },
				cookie: 'valid_token',
			})
			const res = await POST(request, context)
			expect(res.status).toBe(201)
		}
	})
})
