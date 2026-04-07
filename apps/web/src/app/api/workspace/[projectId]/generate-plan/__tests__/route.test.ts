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
	projectsCreateLimit: null,
}))

const { mockDbSelect, mockDbInsert, mockMessagesCreate } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbInsert: vi.fn(),
	mockMessagesCreate: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
		insert: mockDbInsert,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	kanbanCards: { projectId: 'project_id', parentId: 'parent_id', position: 'position' },
	projects: { id: 'id', userId: 'user_id', deletedAt: 'deleted_at' },
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
	sql: vi.fn(() => 'sql_expr'),
}))

vi.mock('@anthropic-ai/sdk', () => {
	return {
		default: class MockAnthropic {
			messages = { create: mockMessagesCreate }
		},
	}
})

vi.mock('@/server/lib/anthropic', () => ({
	getAnthropicClient: () => ({ messages: { create: mockMessagesCreate } }),
	MODELS: {
		HAIKU: 'claude-haiku-4-5-20251001',
		SONNET: 'claude-sonnet-4-6',
		OPUS: 'claude-opus-4-6',
	},
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

const { POST } = await import('../route')

const VALID_PROJECT_ID = '11111111-1111-4111-8111-111111111111'

const VALID_MESSAGES = [
	{ role: 'user' as const, content: 'I want a weight loss tracker' },
	{ role: 'assistant' as const, content: 'What do you want to see first?' },
	{ role: 'user' as const, content: 'A chart of my weight' },
	{ role: 'assistant' as const, content: 'How will you input data?' },
	{ role: 'user' as const, content: 'Typing it in' },
	{ role: 'assistant' as const, content: 'Just for you?' },
	{ role: 'user' as const, content: 'Yes, just me' },
	{ role: 'assistant' as const, content: 'Do you want notifications?' },
	{ role: 'user' as const, content: 'Weekly email' },
	{ role: 'assistant' as const, content: 'Anything else?' },
	{ role: 'user' as const, content: 'Track exercise too' },
]

const VALID_PLAN_OUTPUT = {
	milestones: [
		{
			title: 'Dashboard layout',
			description: 'Your main screen with weight and exercise at a glance',
			whatYouLearn: "You'll see how apps organize information on a screen",
			taskType: 'page',
			subtasks: [
				{
					title: 'Weight display card',
					description: 'Shows your current weight and recent trend',
					whatYouLearn: "You'll learn how apps show key numbers prominently",
					taskType: 'feature',
					componentType: 'dashboard',
					acceptanceCriteria: ['Displays current weight', 'Shows 7-day trend'],
				},
			],
		},
		{
			title: 'Weight input form',
			description: 'A form where you log your weight',
			whatYouLearn: "You'll learn how apps collect data from you",
			taskType: 'feature',
			subtasks: [
				{
					title: 'Weight entry field',
					description: 'Simple number input for daily weight',
					whatYouLearn: "You'll learn how forms validate your input",
					taskType: 'feature',
					componentType: 'form',
					acceptanceCriteria: ['Accepts weight in kg or lbs'],
				},
			],
		},
	],
}

function makeRequest(opts: { body: unknown; cookie?: string; projectId?: string }): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const projectId = opts.projectId ?? VALID_PROJECT_ID
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/generate-plan`, {
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
	mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID })

	mockDbSelect.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue([{ maxPosition: -1 }]),
		}),
	})

	let cardId = 0
	mockDbInsert.mockReturnValue({
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockImplementation(() =>
				Promise.resolve([
					{
						id: `card-${++cardId}`,
						projectId: VALID_PROJECT_ID,
						title: 'generated card',
						position: cardId,
					},
				]),
			),
		}),
	})
}

describe('POST /api/workspace/[projectId]/generate-plan', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when no auth cookie is present', async () => {
		const { request, context } = makeRequest({ body: { messages: VALID_MESSAGES } })
		const res = await POST(request, context)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'bogus',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(401)
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
			projectId: 'not-a-uuid',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when messages array is too short', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID })
		const { request, context } = makeRequest({
			body: { messages: [{ role: 'user', content: 'hi' }] },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
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

	it('calls Haiku with the plan generation system prompt', async () => {
		setupDbMocks()
		mockMessagesCreate.mockResolvedValue({
			content: [{ type: 'text', text: JSON.stringify(VALID_PLAN_OUTPUT) }],
		})

		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
		})
		await POST(request, context)

		expect(mockMessagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'claude-haiku-4-5-20251001',
				system: expect.stringContaining("Meldar's build planner"),
			}),
			expect.objectContaining({ timeout: 60_000 }),
		)
	})

	it('validates Haiku output with Zod and inserts cards on success', async () => {
		setupDbMocks()
		mockMessagesCreate.mockResolvedValue({
			content: [{ type: 'text', text: JSON.stringify(VALID_PLAN_OUTPUT) }],
		})

		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(201)

		const json = (await res.json()) as { cards: unknown[] }
		expect(json.cards).toBeDefined()
		expect(json.cards.length).toBeGreaterThan(0)
	})

	it('retries once when Haiku output fails validation', async () => {
		setupDbMocks()
		mockMessagesCreate
			.mockResolvedValueOnce({
				content: [{ type: 'text', text: '{"invalid": true}' }],
			})
			.mockResolvedValueOnce({
				content: [{ type: 'text', text: JSON.stringify(VALID_PLAN_OUTPUT) }],
			})

		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)

		expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
		expect(res.status).toBe(201)
	})

	it('returns 500 when both Haiku attempts fail validation', async () => {
		setupDbMocks()
		mockMessagesCreate.mockResolvedValue({
			content: [{ type: 'text', text: '{"garbage": true}' }],
		})

		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)

		expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
		expect(res.status).toBe(500)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('GENERATION_FAILED')
	})

	it('returns 404 when project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)

		const { request, context } = makeRequest({
			body: { messages: VALID_MESSAGES },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
	})
})
