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
	adaptiveLimit: null,
	checkRateLimit: async () => ({ success: true }),
}))

const { mockDbSelect, mockMessagesCreate } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockMessagesCreate: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	projects: { id: 'id', userId: 'user_id', deletedAt: 'deleted_at' },
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
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

function makeRequest(opts: { body: unknown; cookie?: string; projectId?: string }): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const projectId = opts.projectId ?? VALID_PROJECT_ID
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/ask-question`, {
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
}

describe('POST /api/workspace/[projectId]/ask-question', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when no auth cookie is present', async () => {
		const { request, context } = makeRequest({
			body: { messages: [{ role: 'user', content: 'hi' }], questionIndex: 1 },
		})
		const res = await POST(request, context)
		expect(res.status).toBe(401)
	})

	it('returns 400 when projectId is not a UUID', async () => {
		const { request, context } = makeRequest({
			body: { messages: [{ role: 'user', content: 'hi' }], questionIndex: 1 },
			cookie: 'valid_token',
			projectId: 'bad-id',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
	})

	it('returns 400 when questionIndex is out of range', async () => {
		setupDbMocks()
		const { request, context } = makeRequest({
			body: { messages: [{ role: 'user', content: 'hi' }], questionIndex: 7 },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
	})

	it('returns the question from Haiku on success', async () => {
		setupDbMocks()
		mockMessagesCreate.mockResolvedValue({
			content: [{ type: 'text', text: 'What do you want to see first when you open the app?' }],
		})

		const { request, context } = makeRequest({
			body: {
				messages: [{ role: 'user', content: 'I want a weight loss tracker' }],
				questionIndex: 1,
			},
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(200)

		const json = (await res.json()) as { question: string }
		expect(json.question).toBe('What do you want to see first when you open the app?')
	})

	it('calls Haiku with the themed system prompt', async () => {
		setupDbMocks()
		mockMessagesCreate.mockResolvedValue({
			content: [{ type: 'text', text: 'How will you add your data?' }],
		})

		const { request, context } = makeRequest({
			body: {
				messages: [{ role: 'user', content: 'A budget tracker' }],
				questionIndex: 2,
			},
			cookie: 'valid_token',
		})
		await POST(request, context)

		expect(mockMessagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'claude-haiku-4-5-20251001',
				system: expect.stringContaining('input method'),
			}),
			expect.objectContaining({ timeout: 30_000 }),
		)
	})

	it('returns 404 when project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)

		const { request, context } = makeRequest({
			body: {
				messages: [{ role: 'user', content: 'hi' }],
				questionIndex: 1,
			},
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
	})
})
