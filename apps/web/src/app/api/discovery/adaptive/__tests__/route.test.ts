import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockCheckRateLimit,
	mockGenerateAdaptiveFollowUps,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
	mockGenerateAdaptiveFollowUps: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	discoverySessions: {
		id: 'id',
		screenTimeData: 'screenTimeData',
		occupation: 'occupation',
		ageBracket: 'ageBracket',
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

vi.mock('@/server/discovery/adaptive', () => ({
	generateAdaptiveFollowUps: mockGenerateAdaptiveFollowUps,
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../adaptive/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/discovery/adaptive', body)
}

const fakeScreenTimeData = {
	apps: [
		{ name: 'Instagram', usageMinutes: 90, category: 'social' },
		{ name: 'Safari', usageMinutes: 45, category: 'productivity' },
	],
	totalScreenTimeMinutes: 360,
	platform: 'ios',
}

const fakeSession = {
	id: 'session123',
	screenTimeData: fakeScreenTimeData,
	occupation: 'Designer',
	ageBracket: '25-34',
}

const fakeFollowUps = [
	{
		type: 'screenshot',
		title: 'Show us your Spotify listening history',
		description: 'Upload a screenshot of your Spotify stats',
		accept: 'image/*',
	},
	{
		type: 'question',
		title: 'How often do you order food delivery?',
		description: 'This helps us understand your spending patterns',
		options: ['Daily', 'Weekly', 'Rarely', 'Never'],
	},
]

function setupDbChain(result: unknown[]) {
	mockDbSelect.mockReturnValue({ from: mockDbFrom })
	mockDbFrom.mockReturnValue({ where: mockDbWhere })
	mockDbWhere.mockReturnValue({ limit: mockDbLimit })
	mockDbLimit.mockResolvedValue(result)
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/discovery/adaptive', () => {
	beforeEach(() => {
		mockCheckRateLimit.mockResolvedValue({ success: true })
		setupDbChain([fakeSession])
		mockGenerateAdaptiveFollowUps.mockResolvedValue(fakeFollowUps)
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
	})

	describe('session not found', () => {
		it('returns 404 NOT_FOUND when session query returns no rows', async () => {
			setupDbChain([])

			const res = await POST(makeRequest({ sessionId: 'nonexistent' }))
			const json = await res.json()

			expect(res.status).toBe(404)
			expect(json.error.code).toBe('NOT_FOUND')
		})
	})

	describe('missing screen time data', () => {
		it('returns 400 MISSING_DATA when session.screenTimeData is null', async () => {
			setupDbChain([{ ...fakeSession, screenTimeData: null }])

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('MISSING_DATA')
		})

		it('returns 400 MISSING_DATA when session.screenTimeData.apps is an empty array', async () => {
			setupDbChain([{ ...fakeSession, screenTimeData: { ...fakeScreenTimeData, apps: [] } }])

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('MISSING_DATA')
		})
	})

	describe('happy path', () => {
		it('maps screenTime.apps to { name, usageMinutes, category } shape for generateAdaptiveFollowUps', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockGenerateAdaptiveFollowUps).toHaveBeenCalledWith(
				expect.objectContaining({
					screenTimeApps: [
						{ name: 'Instagram', usageMinutes: 90, category: 'social' },
						{ name: 'Safari', usageMinutes: 45, category: 'productivity' },
					],
				}),
			)
		})

		it('passes occupation from session to generateAdaptiveFollowUps', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockGenerateAdaptiveFollowUps).toHaveBeenCalledWith(
				expect.objectContaining({
					occupation: 'Designer',
				}),
			)
		})

		it('passes ageBracket from session to generateAdaptiveFollowUps', async () => {
			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockGenerateAdaptiveFollowUps).toHaveBeenCalledWith(
				expect.objectContaining({
					ageBracket: '25-34',
				}),
			)
		})

		it('defaults occupation to "unknown" when DB column is null', async () => {
			setupDbChain([{ ...fakeSession, occupation: null }])

			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockGenerateAdaptiveFollowUps).toHaveBeenCalledWith(
				expect.objectContaining({
					occupation: 'unknown',
				}),
			)
		})

		it('defaults ageBracket to "unknown" when DB column is null', async () => {
			setupDbChain([{ ...fakeSession, ageBracket: null }])

			await POST(makeRequest({ sessionId: 'session123' }))

			expect(mockGenerateAdaptiveFollowUps).toHaveBeenCalledWith(
				expect.objectContaining({
					ageBracket: 'unknown',
				}),
			)
		})

		it('returns { followUps } array', async () => {
			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.followUps).toEqual(fakeFollowUps)
		})
	})

	describe('errors', () => {
		it('returns 500 INTERNAL_ERROR when generateAdaptiveFollowUps throws', async () => {
			mockGenerateAdaptiveFollowUps.mockRejectedValue(new Error('AI API failed'))

			const res = await POST(makeRequest({ sessionId: 'session123' }))
			const json = await res.json()

			expect(res.status).toBe(500)
			expect(json.error.code).toBe('INTERNAL_ERROR')
		})
	})
})
