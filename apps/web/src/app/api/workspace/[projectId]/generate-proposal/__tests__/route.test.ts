import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/server/lib/rate-limit', () => ({
	mustHaveRateLimit: (limiter: unknown, _name: string) => limiter,
	generateProposalLimit: null,
	checkRateLimit: async () => ({ success: true }),
}))

vi.mock('@/server/lib/spend-ceiling', () => ({
	checkAllSpendCeilings: async () => ({ allowed: true }),
	recordGlobalSpend: async () => {},
	recordUserHourlySpend: async () => {},
	recordUserDailySpend: async () => {},
}))

vi.mock('@/server/lib/ai-call-log', () => ({
	recordAiCall: vi.fn(),
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

const { mockStream } = vi.hoisted(() => ({
	mockStream: vi.fn(),
}))

vi.mock('@/server/lib/anthropic', () => ({
	getAnthropicClient: () => ({
		messages: {
			stream: mockStream,
		},
	}),
	MODELS: { HAIKU: 'claude-haiku-4-5-20251001' },
}))

vi.mock('@meldar/tokens', () => ({
	usageToCents: () => 1,
}))

vi.mock('@meldar/db/schema', () => ({
	projects: { id: 'id', userId: 'user_id', deletedAt: 'deleted_at' },
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({})),
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
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/generate-proposal`, {
		method: 'POST',
		headers,
		body: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
	})
	return {
		request,
		context: { params: Promise.resolve({ projectId }) },
	}
}

function mockHaikuResponse(proposal: Record<string, unknown>) {
	mockStream.mockReturnValue({
		finalMessage: vi.fn().mockResolvedValue({
			content: [{ type: 'text', text: JSON.stringify(proposal) }],
			usage: { input_tokens: 100, output_tokens: 50 },
			stop_reason: 'end_turn',
		}),
	})
}

describe('POST /api/workspace/[projectId]/generate-proposal', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 without auth cookie', async () => {
		const { request, context } = makeRequest({ body: { description: 'A recipe app' } })
		const res = await POST(request, context)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 400 without description', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })
		const { request, context } = makeRequest({
			body: {},
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 with empty description', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })
		const { request, context } = makeRequest({
			body: { description: '' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns structured proposal with all required fields', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })
		mockHaikuResponse({
			appType: 'Recipe organizer',
			style: 'Clean and modern',
			palette: 'Warm earth tones',
			sections: ['Recipes', 'Meal planner', 'Shopping list'],
			tone: 'Friendly',
		})
		const { request, context } = makeRequest({
			body: { description: 'A recipe app for organizing my meals' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(200)
		const json = (await res.json()) as {
			proposal: {
				appType: string
				style: string
				palette: string
				sections: string[]
				tone: string
			}
		}
		expect(json.proposal).toBeDefined()
		expect(json.proposal.appType).toBe('Recipe organizer')
		expect(json.proposal.style).toBe('Clean and modern')
		expect(json.proposal.palette).toBe('Warm earth tones')
		expect(json.proposal.sections).toEqual(['Recipes', 'Meal planner', 'Shopping list'])
		expect(json.proposal.tone).toBe('Friendly')
	})

	it('each proposal field is within length limits', async () => {
		mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })
		mockHaikuResponse({
			appType: 'Recipe organizer',
			style: 'Clean and modern',
			palette: 'Warm earth tones',
			sections: ['Recipes', 'Meal planner'],
			tone: 'Friendly',
		})
		const { request, context } = makeRequest({
			body: { description: 'A recipe app' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(200)
		const json = (await res.json()) as {
			proposal: {
				appType: string
				style: string
				palette: string
				sections: string[]
				tone: string
			}
		}
		expect(json.proposal.appType.length).toBeLessThanOrEqual(40)
		expect(json.proposal.style.length).toBeLessThanOrEqual(30)
		expect(json.proposal.palette.length).toBeLessThanOrEqual(30)
		expect(json.proposal.sections.length).toBeLessThanOrEqual(8)
		expect(json.proposal.sections.length).toBeGreaterThanOrEqual(2)
		for (const section of json.proposal.sections) {
			expect(section.length).toBeLessThanOrEqual(30)
		}
		expect(json.proposal.tone.length).toBeLessThanOrEqual(30)
	})

	it('returns 404 for non-existent project', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const { request, context } = makeRequest({
			body: { description: 'A recipe app' },
			cookie: 'valid_token',
		})
		const res = await POST(request, context)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})
})
