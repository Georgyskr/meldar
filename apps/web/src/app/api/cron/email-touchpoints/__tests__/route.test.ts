import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
	mockSendNudgeEmail,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockSendNudgeEmail: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	users: {
		id: 'users.id',
		email: 'users.email',
		name: 'users.name',
		createdAt: 'users.created_at',
		lastNudgeSentAt: 'users.last_nudge_sent_at',
	},
	builds: {
		projectId: 'builds.project_id',
		status: 'builds.status',
	},
}))

vi.mock('@/server/email', () => ({
	sendNudgeEmail: (...args: unknown[]) => mockSendNudgeEmail(...args),
}))

import { GET } from '../route'

const CRON_SECRET = 'test-cron-secret'

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost/api/cron/email-touchpoints', {
		method: 'GET',
		headers,
	})
}

function setupSelectChain(results: unknown[] = []) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(results)
}

function setupUpdateChain() {
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue(undefined)
}

describe('GET /api/cron/email-touchpoints', () => {
	beforeEach(() => {
		vi.stubEnv('CRON_SECRET', CRON_SECRET)
		setupSelectChain([])
		setupUpdateChain()
		mockSendNudgeEmail.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllEnvs()
	})

	it('returns 401 for missing Authorization header', async () => {
		const res = await GET(makeRequest())
		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 401 for wrong secret', async () => {
		const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }))
		expect(res.status).toBe(401)
	})

	it('returns 200 with correct secret and empty user set', async () => {
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.sent.day1).toBe(0)
		expect(json.sent.day7).toBe(0)
	})

	it('sends Day 1 nudge emails to qualifying users', async () => {
		const day1Users = [
			{ id: 'user-1', email: 'user1@test.com', name: 'Alice' },
			{ id: 'user-2', email: 'user2@test.com', name: null },
		]

		let callCount = 0
		mockDbLimit.mockImplementation(() => {
			callCount++
			if (callCount === 1) return Promise.resolve(day1Users)
			return Promise.resolve([])
		})

		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		const json = await res.json()

		expect(json.sent.day1).toBe(2)
		expect(mockSendNudgeEmail).toHaveBeenCalledWith('user1@test.com', 'Alice', 1)
		expect(mockSendNudgeEmail).toHaveBeenCalledWith('user2@test.com', null, 1)
	})

	it('sends Day 7 nudge emails to qualifying users', async () => {
		const day7Users = [{ id: 'user-7', email: 'user7@test.com', name: 'Bob' }]

		let callCount = 0
		mockDbLimit.mockImplementation(() => {
			callCount++
			if (callCount === 1) return Promise.resolve([])
			if (callCount === 2) return Promise.resolve(day7Users)
			return Promise.resolve([])
		})

		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		const json = await res.json()

		expect(json.sent.day7).toBe(1)
		expect(mockSendNudgeEmail).toHaveBeenCalledWith('user7@test.com', 'Bob', 7)
	})

	it('caps total emails at 50 per batch', async () => {
		const manyUsers = Array.from({ length: 50 }, (_, i) => ({
			id: `user-${i}`,
			email: `user${i}@test.com`,
			name: `User ${i}`,
		}))

		let callCount = 0
		mockDbLimit.mockImplementation(() => {
			callCount++
			if (callCount === 1) return Promise.resolve(manyUsers)
			return Promise.resolve([{ id: 'extra', email: 'extra@test.com', name: 'Extra' }])
		})

		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		const json = await res.json()

		expect(json.budget.max).toBe(50)
		expect(json.budget.used).toBeLessThanOrEqual(50)
	})

	it('continues processing when a single email fails', async () => {
		const day1Users = [
			{ id: 'user-fail', email: 'fail@test.com', name: 'Fail' },
			{ id: 'user-ok', email: 'ok@test.com', name: 'OK' },
		]

		let callCount = 0
		mockDbLimit.mockImplementation(() => {
			callCount++
			if (callCount === 1) return Promise.resolve(day1Users)
			return Promise.resolve([])
		})

		mockSendNudgeEmail
			.mockRejectedValueOnce(new Error('Resend down'))
			.mockResolvedValueOnce(undefined)

		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		const json = await res.json()

		expect(json.sent.day1).toBe(1)
		expect(mockSendNudgeEmail).toHaveBeenCalledTimes(2)
	})

	it('does not expose CRON_SECRET in response body', async () => {
		const res = await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }))
		const text = await res.clone().text()
		expect(text).not.toContain(CRON_SECRET)
	})
})
