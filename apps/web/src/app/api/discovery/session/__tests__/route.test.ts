import { makeNextJsonRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockDbInsert, mockDbValues, mockCheckRateLimit, mockNanoid } = vi.hoisted(() => ({
	mockDbInsert: vi.fn(),
	mockDbValues: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
	mockNanoid: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		insert: mockDbInsert,
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	discoverySessions: Symbol('discoverySessions'),
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

vi.mock('nanoid', () => ({
	nanoid: mockNanoid,
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../session/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
	return makeNextJsonRequest('http://localhost/api/discovery/session', body)
}

const validBody = {
	occupation: 'Developer',
	ageBracket: '25-34',
	quizPicks: ['time-blindness', 'email-overload'],
	aiComfort: 2,
	aiToolsUsed: ['ChatGPT'],
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/discovery/session', () => {
	beforeEach(() => {
		mockCheckRateLimit.mockResolvedValue({ success: true })
		mockNanoid.mockReturnValue('abcdef1234567890')
		mockDbInsert.mockReturnValue({ values: mockDbValues })
		mockDbValues.mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('rate limiting', () => {
		it('returns 429 with RATE_LIMITED code when checkRateLimit returns { success: false }', async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false })

			const res = await POST(makeRequest(validBody))
			const json = await res.json()

			expect(res.status).toBe(429)
			expect(json.error.code).toBe('RATE_LIMITED')
		})
	})

	describe('input validation', () => {
		it('returns 400 VALIDATION_ERROR when occupation is missing', async () => {
			const { occupation: _, ...body } = validBody
			const res = await POST(makeRequest(body))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when occupation exceeds 50 chars', async () => {
			const res = await POST(makeRequest({ ...validBody, occupation: 'x'.repeat(51) }))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when ageBracket is missing', async () => {
			const { ageBracket: _, ...body } = validBody
			const res = await POST(makeRequest(body))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when quizPicks is an empty array', async () => {
			const res = await POST(makeRequest({ ...validBody, quizPicks: [] }))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when quizPicks has more than 12 entries', async () => {
			const res = await POST(
				makeRequest({
					...validBody,
					quizPicks: Array.from({ length: 13 }, (_, i) => `pick-${i}`),
				}),
			)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when aiComfort is 0 (below min)', async () => {
			const res = await POST(makeRequest({ ...validBody, aiComfort: 0 }))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when aiComfort is 5 (above max)', async () => {
			const res = await POST(makeRequest({ ...validBody, aiComfort: 5 }))
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when aiToolsUsed has more than 10 entries', async () => {
			const res = await POST(
				makeRequest({
					...validBody,
					aiToolsUsed: Array.from({ length: 11 }, (_, i) => `tool-${i}`),
				}),
			)
			expect(res.status).toBe(400)
			const json = await res.json()
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('happy path', () => {
		it('inserts session into DB with all provided fields', async () => {
			await POST(makeRequest(validBody))

			expect(mockDbInsert).toHaveBeenCalled()
			expect(mockDbValues).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'abcdef1234567890',
					occupation: validBody.occupation,
					ageBracket: validBody.ageBracket,
					quizPicks: validBody.quizPicks,
					aiComfort: validBody.aiComfort,
					aiToolsUsed: validBody.aiToolsUsed,
				}),
			)
		})

		it('returns { sessionId } — a 16-character nanoid string', async () => {
			const res = await POST(makeRequest(validBody))
			const json = await res.json()

			expect(json.sessionId).toBe('abcdef1234567890')
			expect(json.sessionId).toHaveLength(16)
		})

		it('returns HTTP 200', async () => {
			const res = await POST(makeRequest(validBody))
			expect(res.status).toBe(200)
		})
	})

	describe('database errors', () => {
		it('returns 500 INTERNAL_ERROR when DB insert throws', async () => {
			mockDbValues.mockRejectedValue(new Error('Database connection failed'))

			const res = await POST(makeRequest(validBody))
			const json = await res.json()

			expect(res.status).toBe(500)
			expect(json.error.code).toBe('INTERNAL_ERROR')
		})
	})
})
