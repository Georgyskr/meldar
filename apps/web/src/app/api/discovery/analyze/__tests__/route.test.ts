import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
	mockCheckRateLimit,
	mockRunCrossAnalysis,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
	mockRunCrossAnalysis: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
		update: mockDbUpdate,
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	discoverySessions: {
		id: 'id',
		analysis: 'analysis',
		quizPicks: 'quizPicks',
		aiComfort: 'aiComfort',
		aiToolsUsed: 'aiToolsUsed',
		screenTimeData: 'screenTimeData',
		chatgptData: 'chatgptData',
		claudeData: 'claudeData',
		googleData: 'googleData',
		subscriptionsData: 'subscriptionsData',
		batteryData: 'batteryData',
		storageData: 'storageData',
		calendarData: 'calendarData',
		healthData: 'healthData',
		adaptiveData: 'adaptiveData',
	},
}))

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
}))

vi.mock('@/server/lib/rate-limit', () => ({
	checkRateLimit: mockCheckRateLimit,
	screentimeLimit: null,
	quizLimit: null,
	analyzeLimit: null,
	adaptiveLimit: null,
	checkoutLimit: null,
	loginLimit: null,
	resetLimit: null,
	subscribeLimit: null,
}))

vi.mock('@/server/discovery/analyze', () => ({
	runCrossAnalysis: mockRunCrossAnalysis,
}))

import { POST } from '../../analyze/route'

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/discovery/analyze', body)
}

const fakeAnalysis = {
	recommendedApp: {
		name: 'MealPlanner',
		description: 'Plan your meals',
		complexity: 'beginner',
	},
	additionalApps: [],
	learningModules: [{ name: 'Getting Started', locked: false }],
	keyInsights: ['You spend too much time on social media'],
	dataProfile: { topCategory: 'social' },
}

const fakeSessionData = {
	quizPicks: ['time-blindness'],
	aiComfort: 2,
	aiToolsUsed: ['ChatGPT'],
	screenTimeData: { apps: [] },
	chatgptData: null,
	claudeData: null,
	googleData: null,
	subscriptionsData: null,
	batteryData: null,
	storageData: null,
	calendarData: null,
	healthData: null,
	adaptiveData: null,
}

function setupSelectChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

function setupUpdateChain() {
	mockDbUpdate.mockReturnValue({ set: mockDbSet })
	mockDbSet.mockReturnValue({ where: mockDbUpdateWhere })
	mockDbUpdateWhere.mockResolvedValue(undefined)
}

describe('POST /api/discovery/analyze', () => {
	beforeEach(() => {
		mockCheckRateLimit.mockResolvedValue({ success: true })
		mockRunCrossAnalysis.mockResolvedValue(fakeAnalysis)
		setupUpdateChain()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('rate limiting', () => {
		it('returns 429 when rate limit returns { success: false }', async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false })

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(429)
			expect(json.error.code).toBe('RATE_LIMITED')
		})
	})

	describe('input validation', () => {
		it('returns 400 VALIDATION_ERROR when sessionId is absent', async () => {
			const res = await POST(makeRequest({}))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 when sessionId exceeds 32 characters', async () => {
			const res = await POST(makeRequest({ sessionId: 'x'.repeat(33) }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('session not found', () => {
		it('returns 404 NOT_FOUND when the lightweight cache-check query returns no rows', async () => {
			setupSelectChain([])

			const res = await POST(makeRequest({ sessionId: 'nonexistent' }))
			const json = await res.json()

			expect(res.status).toBe(404)
			expect(json.error.code).toBe('NOT_FOUND')
		})
	})

	describe('analysis cache hit', () => {
		it('returns 200 with existing analysis object without calling runCrossAnalysis', async () => {
			setupSelectChain([{ id: 'session123', analysis: fakeAnalysis }])

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.analysis).toEqual(fakeAnalysis)
			expect(mockRunCrossAnalysis).not.toHaveBeenCalled()
		})

		it('response body includes analysis object and sessionId', async () => {
			setupSelectChain([{ id: 'session123', analysis: fakeAnalysis }])

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(json.analysis).toBeDefined()
			expect(json.sessionId).toBe('session123')
		})
	})

	describe('full analysis path', () => {
		beforeEach(() => {
			// First call: cache check returns no analysis
			// Second call: full session data
			let callCount = 0
			mockDbLimit.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					return Promise.resolve([{ id: 'session123', analysis: null }])
				}
				return Promise.resolve([fakeSessionData])
			})
		})

		it('builds AnalysisInput from all session data columns', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockRunCrossAnalysis).toHaveBeenCalledWith(
				expect.objectContaining({
					quizPicks: fakeSessionData.quizPicks,
					aiComfort: fakeSessionData.aiComfort,
					aiToolsUsed: fakeSessionData.aiToolsUsed,
				}),
			)
		})

		it('defaults quizPicks to [] when DB column is null', async () => {
			let callCount = 0
			mockDbLimit.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					return Promise.resolve([{ id: 'session123', analysis: null }])
				}
				return Promise.resolve([{ ...fakeSessionData, quizPicks: null }])
			})

			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockRunCrossAnalysis).toHaveBeenCalledWith(
				expect.objectContaining({
					quizPicks: [],
				}),
			)
		})

		it('defaults aiComfort to 1 when DB column is null', async () => {
			let callCount = 0
			mockDbLimit.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					return Promise.resolve([{ id: 'session123', analysis: null }])
				}
				return Promise.resolve([{ ...fakeSessionData, aiComfort: null }])
			})

			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockRunCrossAnalysis).toHaveBeenCalledWith(
				expect.objectContaining({
					aiComfort: 1,
				}),
			)
		})

		it('calls runCrossAnalysis with the assembled AnalysisInput', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))
			expect(mockRunCrossAnalysis).toHaveBeenCalledTimes(1)
		})

		it('persists analysis, recommendedApp name, and learningModules to session', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockDbUpdate).toHaveBeenCalled()
			expect(mockDbSet).toHaveBeenCalledWith(
				expect.objectContaining({
					analysis: fakeAnalysis,
					recommendedApp: fakeAnalysis.recommendedApp.name,
					learningModules: fakeAnalysis.learningModules,
				}),
			)
		})

		it('returns { success: true, analysis, sessionId }', async () => {
			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.analysis).toEqual(fakeAnalysis)
			expect(json.sessionId).toBe('session123')
		})
	})

	describe('errors', () => {
		it('returns 500 INTERNAL_ERROR when runCrossAnalysis throws', async () => {
			let callCount = 0
			mockDbLimit.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					return Promise.resolve([{ id: 'session123', analysis: null }])
				}
				return Promise.resolve([fakeSessionData])
			})
			mockRunCrossAnalysis.mockRejectedValue(new Error('AI failed'))

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(500)
			expect(json.error.code).toBe('INTERNAL_ERROR')
		})
	})
})
