import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/identity/jwt', () => ({
	verifyToken: vi.fn((token: string) => {
		if (token === 'valid_token') return { userId: 'user_1', email: 'u@x.com' }
		return null
	}),
}))

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const CARD_ID_1 = '660e8400-e29b-41d4-a716-446655440001'
const CARD_ID_2 = '660e8400-e29b-41d4-a716-446655440002'
const CARD_ID_3 = '660e8400-e29b-41d4-a716-446655440003'
const SUBTASK_ID_1 = '770e8400-e29b-41d4-a716-446655440001'

type Card = {
	id: string
	projectId: string
	parentId: string | null
	position: number
	state: string
	required: boolean
	title: string
	description: string | null
	taskType: string
	acceptanceCriteria: string[] | null
	explainerText: string | null
	generatedBy: string
	tokenCostEstimateMin: number | null
	tokenCostEstimateMax: number | null
	tokenCostActual: number | null
	dependsOn: string[]
	blockedReason: string | null
	lastBuildId: string | null
	createdAt: Date
	updatedAt: Date
	builtAt: Date | null
}

let idCounter = 0

function makeCard(overrides: Partial<Card> = {}): Card {
	idCounter++
	return {
		id: overrides.id ?? `card-${idCounter}`,
		projectId: PROJECT_ID,
		parentId: null,
		position: 0,
		state: 'draft',
		required: false,
		title: `Card ${idCounter}`,
		description: null,
		taskType: 'feature',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'user',
		tokenCostEstimateMin: null,
		tokenCostEstimateMax: null,
		tokenCostActual: null,
		dependsOn: [],
		blockedReason: null,
		lastBuildId: null,
		createdAt: new Date('2026-04-07T00:00:00Z'),
		updatedAt: new Date('2026-04-07T00:00:00Z'),
		builtAt: null,
		...overrides,
	}
}

const mockDb = {
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	transaction: vi.fn(),
}

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockDb,
}))

vi.mock('@meldar/db/schema', () => ({
	kanbanCards: {
		id: 'kanban_cards.id',
		projectId: 'kanban_cards.project_id',
		parentId: 'kanban_cards.parent_id',
		position: 'kanban_cards.position',
		state: 'kanban_cards.state',
		required: 'kanban_cards.required',
		title: 'kanban_cards.title',
		description: 'kanban_cards.description',
		taskType: 'kanban_cards.task_type',
		acceptanceCriteria: 'kanban_cards.acceptance_criteria',
		explainerText: 'kanban_cards.explainer_text',
		generatedBy: 'kanban_cards.generated_by',
		tokenCostEstimateMin: 'kanban_cards.token_cost_estimate_min',
		tokenCostEstimateMax: 'kanban_cards.token_cost_estimate_max',
		tokenCostActual: 'kanban_cards.token_cost_actual',
		dependsOn: 'kanban_cards.depends_on',
		blockedReason: 'kanban_cards.blocked_reason',
		lastBuildId: 'kanban_cards.last_build_id',
		createdAt: 'kanban_cards.created_at',
		updatedAt: 'kanban_cards.updated_at',
		builtAt: 'kanban_cards.built_at',
	},
	projects: {
		id: 'projects.id',
		userId: 'projects.user_id',
		deletedAt: 'projects.deleted_at',
	},
}))

vi.mock('@/server/lib/rate-limit', () => ({
	cardsLimit: null,
	mustHaveRateLimit: (limiter: unknown, _name: string) => limiter,
}))

const { mockVerifyProjectOwnership } = vi.hoisted(() => ({
	mockVerifyProjectOwnership: vi.fn(),
}))

vi.mock('@/server/lib/verify-project-ownership', () => ({
	verifyProjectOwnership: mockVerifyProjectOwnership,
}))

vi.mock('@/features/kanban/model/card-state-machine', () => ({
	canTransition: vi.fn((_from: string, _to: string) => true),
}))

const { GET, POST } = await import('../route')
const { PATCH, DELETE } = await import('../[cardId]/route')
const { PATCH: REORDER_PATCH } = await import('../reorder/route')

function makeGetRequest(projectId: string, cookie?: string): NextRequest {
	const headers = new Headers()
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${projectId}/cards`, {
		method: 'GET',
		headers,
	})
}

function makePostRequest(projectId: string, body: unknown, cookie?: string): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${projectId}/cards`, {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

function makePatchRequest(
	projectId: string,
	cardId: string,
	body: unknown,
	cookie?: string,
): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${projectId}/cards/${cardId}`, {
		method: 'PATCH',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

function makeDeleteRequest(projectId: string, cardId: string, cookie?: string): NextRequest {
	const headers = new Headers()
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${projectId}/cards/${cardId}`, {
		method: 'DELETE',
		headers,
	})
}

function makeReorderRequest(projectId: string, body: unknown, cookie?: string): NextRequest {
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (cookie) headers.set('cookie', `meldar-auth=${cookie}`)
	return new NextRequest(`http://localhost/api/workspace/${projectId}/cards/reorder`, {
		method: 'PATCH',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

const routeContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

function cardRouteContext(cardId: string) {
	return { params: Promise.resolve({ projectId: PROJECT_ID, cardId }) }
}

beforeEach(() => {
	idCounter = 0
	vi.clearAllMocks()
	mockVerifyProjectOwnership.mockResolvedValue({ id: PROJECT_ID })
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('GET /api/workspace/[projectId]/cards', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await GET(makeGetRequest(PROJECT_ID), routeContext)
		expect(res.status).toBe(401)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('UNAUTHENTICATED')
	})

	it('returns 401 when the cookie is invalid', async () => {
		const res = await GET(makeGetRequest(PROJECT_ID, 'bogus'), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not belong to the user', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await GET(makeGetRequest(PROJECT_ID, 'valid_token'), routeContext)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})

	it('returns an empty list when the project has no cards', async () => {
		const cardsChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockResolvedValue([]),
		}

		mockDb.select.mockReturnValue(cardsChain)

		const res = await GET(makeGetRequest(PROJECT_ID, 'valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { cards: unknown[] }
		expect(json.cards).toEqual([])
	})

	it('returns cards ordered by parentId nulls first, then position', async () => {
		const milestone = makeCard({ id: CARD_ID_1, title: 'Milestone', parentId: null, position: 0 })
		const subtask = makeCard({
			id: SUBTASK_ID_1,
			title: 'Subtask',
			parentId: CARD_ID_1,
			position: 0,
		})

		const cardsChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockResolvedValue([milestone, subtask]),
		}

		mockDb.select.mockReturnValue(cardsChain)

		const res = await GET(makeGetRequest(PROJECT_ID, 'valid_token'), routeContext)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { cards: Card[] }
		expect(json.cards).toHaveLength(2)
		expect(json.cards[0].title).toBe('Milestone')
		expect(json.cards[1].title).toBe('Subtask')
	})
})

describe('POST /api/workspace/[projectId]/cards', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await POST(makePostRequest(PROJECT_ID, { title: 'X' }), routeContext)
		expect(res.status).toBe(401)
	})

	it('returns 404 when the project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await POST(makePostRequest(PROJECT_ID, { title: 'X' }, 'valid_token'), routeContext)
		expect(res.status).toBe(404)
	})

	it('returns 400 on invalid JSON', async () => {
		const res = await POST(makePostRequest(PROJECT_ID, 'not json{', 'valid_token'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('INVALID_JSON')
	})

	it('returns 400 when title is missing', async () => {
		const res = await POST(makePostRequest(PROJECT_ID, {}, 'valid_token'), routeContext)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('returns 400 when title exceeds 80 chars', async () => {
		const res = await POST(
			makePostRequest(PROJECT_ID, { title: 'x'.repeat(81) }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('creates a card with defaults and returns 201', async () => {
		const created = makeCard({ id: CARD_ID_1, title: 'Dashboard layout' })

		const maxPosChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([{ maxPosition: -1 }]),
		}
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockResolvedValue([created]),
		}

		mockDb.select.mockReturnValue(maxPosChain)
		mockDb.insert.mockReturnValue(insertChain)

		const res = await POST(
			makePostRequest(PROJECT_ID, { title: 'Dashboard layout' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(201)
		const json = (await res.json()) as { card: Card }
		expect(json.card.title).toBe('Dashboard layout')
		expect(json.card.state).toBe('draft')
		expect(json.card.taskType).toBe('feature')
		expect(json.card.generatedBy).toBe('user')
	})

	it('creates a subtask under a parent milestone', async () => {
		const created = makeCard({
			id: SUBTASK_ID_1,
			title: 'Nav bar',
			parentId: CARD_ID_1,
			position: 0,
		})

		const maxPosChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([{ maxPosition: -1 }]),
		}
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockResolvedValue([created]),
		}

		mockDb.select.mockReturnValue(maxPosChain)
		mockDb.insert.mockReturnValue(insertChain)

		const res = await POST(
			makePostRequest(
				PROJECT_ID,
				{ title: 'Nav bar', parentId: CARD_ID_1, taskType: 'page' },
				'valid_token',
			),
			routeContext,
		)
		expect(res.status).toBe(201)
		const json = (await res.json()) as { card: Card }
		expect(json.card.parentId).toBe(CARD_ID_1)
	})

	it('auto-increments position based on existing siblings', async () => {
		const created = makeCard({ id: CARD_ID_2, title: 'Second card', position: 3 })

		const maxPosChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([{ maxPosition: 2 }]),
		}
		const insertChain = {
			values: vi.fn().mockReturnThis(),
			returning: vi.fn().mockResolvedValue([created]),
		}

		mockDb.select.mockReturnValue(maxPosChain)
		mockDb.insert.mockReturnValue(insertChain)

		const res = await POST(
			makePostRequest(PROJECT_ID, { title: 'Second card' }, 'valid_token'),
			routeContext,
		)
		expect(res.status).toBe(201)
		expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ position: 3 }))
	})
})

describe('PATCH /api/workspace/[projectId]/cards/[cardId]', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await PATCH(
			makePatchRequest(PROJECT_ID, CARD_ID_1, { title: 'X' }),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(401)
	})

	it('returns 404 when project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await PATCH(
			makePatchRequest(PROJECT_ID, CARD_ID_1, { title: 'X' }, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(404)
	})

	it('returns 400 on invalid update data', async () => {
		const res = await PATCH(
			makePatchRequest(PROJECT_ID, CARD_ID_1, { title: 123 }, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('updates a card and returns the updated record', async () => {
		const currentCard = makeCard({ id: CARD_ID_1, title: 'Old title', state: 'draft' })
		const updated = makeCard({ id: CARD_ID_1, title: 'Updated title', state: 'ready' })

		const selectChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([currentCard]),
		}
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returning: vi.fn().mockResolvedValue([updated]),
		}

		mockDb.select.mockReturnValue(selectChain)
		mockDb.update.mockReturnValue(updateChain)

		const res = await PATCH(
			makePatchRequest(
				PROJECT_ID,
				CARD_ID_1,
				{ title: 'Updated title', state: 'ready' },
				'valid_token',
			),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { card: Card }
		expect(json.card.title).toBe('Updated title')
		expect(json.card.state).toBe('ready')
	})

	it('returns 404 when the card does not exist', async () => {
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returning: vi.fn().mockResolvedValue([]),
		}

		mockDb.update.mockReturnValue(updateChain)

		const res = await PATCH(
			makePatchRequest(PROJECT_ID, CARD_ID_1, { title: 'X' }, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(404)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('NOT_FOUND')
	})
})

describe('DELETE /api/workspace/[projectId]/cards/[cardId]', () => {
	it('returns 401 when no auth cookie is present', async () => {
		const res = await DELETE(makeDeleteRequest(PROJECT_ID, CARD_ID_1), cardRouteContext(CARD_ID_1))
		expect(res.status).toBe(401)
	})

	it('returns 404 when the card does not exist', async () => {
		const cardSelectChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([]),
		}

		mockDb.select.mockReturnValue(cardSelectChain)

		const res = await DELETE(
			makeDeleteRequest(PROJECT_ID, CARD_ID_1, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(404)
	})

	it('deletes a card and returns success', async () => {
		const cardSelectChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([{ id: CARD_ID_1 }]),
		}

		mockDb.select.mockReturnValue(cardSelectChain)

		const deleteChain = {
			where: vi.fn().mockResolvedValue(undefined),
		}
		mockDb.delete.mockReturnValue(deleteChain)

		const res = await DELETE(
			makeDeleteRequest(PROJECT_ID, CARD_ID_1, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { success: boolean }
		expect(json.success).toBe(true)
	})

	it('cascade deletes subtasks via the FK (DB-level)', async () => {
		const cardSelectChain = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([{ id: CARD_ID_1 }]),
		}

		mockDb.select.mockReturnValue(cardSelectChain)

		const deleteChain = {
			where: vi.fn().mockResolvedValue(undefined),
		}
		mockDb.delete.mockReturnValue(deleteChain)

		const res = await DELETE(
			makeDeleteRequest(PROJECT_ID, CARD_ID_1, 'valid_token'),
			cardRouteContext(CARD_ID_1),
		)
		expect(res.status).toBe(200)
		expect(mockDb.delete).toHaveBeenCalledTimes(1)
	})
})

describe('PATCH /api/workspace/[projectId]/cards/reorder', () => {
	const reorderContext = { params: Promise.resolve({ projectId: PROJECT_ID }) }

	it('returns 401 when no auth cookie is present', async () => {
		const res = await REORDER_PATCH(
			makeReorderRequest(PROJECT_ID, { parentId: null, cardIds: [CARD_ID_1] }),
			reorderContext,
		)
		expect(res.status).toBe(401)
	})

	it('returns 404 when project does not exist', async () => {
		mockVerifyProjectOwnership.mockResolvedValue(null)
		const res = await REORDER_PATCH(
			makeReorderRequest(PROJECT_ID, { parentId: null, cardIds: [CARD_ID_1] }, 'valid_token'),
			reorderContext,
		)
		expect(res.status).toBe(404)
	})

	it('returns 400 on invalid body', async () => {
		const res = await REORDER_PATCH(
			makeReorderRequest(PROJECT_ID, { parentId: null, cardIds: [] }, 'valid_token'),
			reorderContext,
		)
		expect(res.status).toBe(400)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe('VALIDATION_ERROR')
	})

	it('reorders cards by updating positions sequentially', async () => {
		const updateChain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(undefined),
		}

		mockDb.update.mockReturnValue(updateChain)

		const res = await REORDER_PATCH(
			makeReorderRequest(
				PROJECT_ID,
				{ parentId: null, cardIds: [CARD_ID_3, CARD_ID_1, CARD_ID_2] },
				'valid_token',
			),
			reorderContext,
		)
		expect(res.status).toBe(200)
		const json = (await res.json()) as { success: boolean }
		expect(json.success).toBe(true)
		expect(mockDb.update).toHaveBeenCalledTimes(3)
	})

	it('returns 400 when cardIds contains non-UUID strings', async () => {
		const res = await REORDER_PATCH(
			makeReorderRequest(PROJECT_ID, { parentId: null, cardIds: ['not-a-uuid'] }, 'valid_token'),
			reorderContext,
		)
		expect(res.status).toBe(400)
	})
})
