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
	wishesLimit: null,
	checkRateLimit: async () => ({ success: true }),
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

const { mockDbSelect, mockDbUpdate } = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbUpdate: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: vi.fn(() => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	})),
}))

vi.mock('@meldar/db/schema', () => ({
	projects: {
		id: 'id',
		userId: 'user_id',
		deletedAt: 'deleted_at',
		wishes: 'wishes',
		updatedAt: 'updated_at',
	},
}))

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
	isNull: vi.fn((a: unknown) => ({ isNull: a })),
}))

const { PATCH } = await import('../route')

const VALID_PROJECT_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(opts: { body: unknown; cookie?: string; projectId?: string }): {
	request: NextRequest
	context: { params: Promise<{ projectId: string }> }
} {
	const projectId = opts.projectId ?? VALID_PROJECT_ID
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (opts.cookie) headers.set('cookie', `meldar-auth=${opts.cookie}`)
	const request = new NextRequest(`http://localhost/api/workspace/${projectId}/wishes`, {
		method: 'PATCH',
		headers,
		body: typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
	})
	return {
		request,
		context: { params: Promise.resolve({ projectId }) },
	}
}

function setupDbMocks(existingWishes: Record<string, unknown> | null = null) {
	mockVerifyProjectOwnership.mockResolvedValue({ id: VALID_PROJECT_ID, name: 'My project' })

	mockDbSelect.mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue([{ wishes: existingWishes }]),
			}),
		}),
	})

	let savedWishes: Record<string, unknown> = {}
	mockDbUpdate.mockReturnValue({
		set: vi.fn().mockImplementation((data: { wishes: Record<string, unknown> }) => {
			savedWishes = data.wishes
			return {
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ wishes: savedWishes }]),
				}),
			}
		}),
	})
}

describe('PATCH /api/workspace/[projectId]/wishes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 without auth', async () => {
		const { request, context } = makeRequest({
			body: { proposal: { appType: 'Todo' } },
		})
		const res = await PATCH(request, context)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 404 for non-existent project', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const { request, context } = makeRequest({
			body: { proposal: { appType: 'Todo' } },
			cookie: 'valid_token',
		})
		const res = await PATCH(request, context)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('saves proposal to wishes column', async () => {
		setupDbMocks(null)
		const proposal = {
			appType: 'Recipe app',
			style: 'Modern',
			palette: 'Warm',
			sections: ['Home', 'Recipes'],
			tone: 'Friendly',
		}
		const { request, context } = makeRequest({
			body: { proposal },
			cookie: 'valid_token',
		})
		const res = await PATCH(request, context)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { wishes: Record<string, unknown> }
		expect(json.wishes).toBeDefined()
		expect(json.wishes.proposal).toEqual(proposal)
	})

	it('merges overrides with existing proposal', async () => {
		setupDbMocks({
			proposal: {
				appType: 'Recipe app',
				style: 'Modern',
				palette: 'Warm',
				sections: ['Home', 'Recipes'],
				tone: 'Friendly',
			},
		})
		const { request, context } = makeRequest({
			body: { overrides: { palette: 'Cool blue', tone: 'Professional' } },
			cookie: 'valid_token',
		})
		const res = await PATCH(request, context)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { wishes: Record<string, unknown> }
		expect(json.wishes.overrides).toEqual({ palette: 'Cool blue', tone: 'Professional' })
		expect((json.wishes.proposal as Record<string, unknown>).appType).toBe('Recipe app')
	})

	it('returns the merged wishes', async () => {
		setupDbMocks({ originalDescription: 'I want a cooking app' })
		const { request, context } = makeRequest({
			body: { approvedAt: '2026-04-10T12:00:00Z' },
			cookie: 'valid_token',
		})
		const res = await PATCH(request, context)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { wishes: Record<string, unknown> }
		expect(json.wishes).toBeDefined()
		expect(json.wishes.originalDescription).toBe('I want a cooking app')
		expect(json.wishes.approvedAt).toBe('2026-04-10T12:00:00Z')
	})
})
