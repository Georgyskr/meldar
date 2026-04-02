import type { NextRequest } from 'next/server'
import { bench, describe, vi } from 'vitest'

// ── Mocks (all I/O mocked — measures routing + validation overhead only) ────

const { mockCheckRateLimit, mockDbInsert, mockDbSelect } = vi.hoisted(() => ({
	mockCheckRateLimit: vi
		.fn<() => Promise<{ success: boolean }>>()
		.mockResolvedValue({ success: true }),
	mockDbInsert: vi.fn(),
	mockDbSelect: vi.fn(),
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

const mockValues = vi.fn().mockResolvedValue([{ id: 'sess-1' }])
const mockFrom = vi.fn().mockReturnValue({
	where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
})

vi.mock('@/server/db/client', () => ({
	getDb: () => ({
		insert: mockDbInsert.mockReturnValue({ values: mockValues }),
		select: mockDbSelect.mockReturnValue({ from: mockFrom }),
		update: vi.fn(),
		execute: vi.fn(),
	}),
}))

vi.mock('@/server/db/schema', () => ({
	discoverySessions: { id: 'id', sourcesProvided: 'sourcesProvided' },
}))

vi.mock('nanoid', () => ({
	nanoid: () => 'bench-session-id',
}))

// Mock all discovery modules to prevent real AI/DB calls from upload route
vi.mock('@/server/discovery/extract-from-text', () => ({
	extractFromOcrText: vi.fn(),
}))
vi.mock('@/server/discovery/extract-screenshot', () => ({
	extractFromScreenshot: vi.fn(),
}))
vi.mock('@/server/discovery/extract-topics', () => ({
	extractTopicsFromMessages: vi.fn(),
	extractGoogleTopics: vi.fn(),
}))
vi.mock('@/server/discovery/ocr', () => ({
	extractScreenTime: vi.fn(),
}))
vi.mock('@/server/discovery/parsers', () => ({
	parseChatGptExport: vi.fn(),
	parseClaudeExport: vi.fn(),
	parseGoogleTakeout: vi.fn(),
}))
vi.mock('@/server/discovery/analyze', () => ({
	runCrossAnalysis: vi.fn(),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeJsonRequest(url: string, body: Record<string, unknown>): NextRequest {
	return new Request(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}) as unknown as NextRequest
}

function makeFormDataRequest(url: string, fields: Record<string, string>): NextRequest {
	const formData = new FormData()
	for (const [key, value] of Object.entries(fields)) {
		formData.append(key, value)
	}
	return new Request(url, {
		method: 'POST',
		body: formData,
	}) as unknown as NextRequest
}

// ── Benchmarks ──────────────────────────────────────────────────────────────

describe('API routing overhead', () => {
	bench('POST /api/discovery/session — validation + mock DB insert', async () => {
		const { POST } = await import('@/app/api/discovery/session/route')
		const req = makeJsonRequest('http://localhost/api/discovery/session', {
			occupation: 'developer',
			ageBracket: '25-34',
			quizPicks: ['email-overload', 'social-scroll'],
			aiComfort: 3,
			aiToolsUsed: ['chatgpt'],
		})
		await POST(req)
	})

	bench('POST /api/discovery/upload — validation only (before DB lookup)', async () => {
		const { POST } = await import('@/app/api/discovery/upload/route')
		// Send a request that passes validation but hits the DB lookup (mocked to return empty)
		const req = makeFormDataRequest('http://localhost/api/discovery/upload', {
			ocrText: 'Screen Time - Daily Average 4h 32m - Instagram 1h 45m',
			platform: 'screentime',
			sessionId: 'bench-session-id',
		})
		await POST(req)
	})

	bench('POST /api/discovery/analyze — cache hit path (no AI call)', async () => {
		// Set up mock to return a cached analysis
		mockDbSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([
						{
							id: 'bench-session-id',
							analysis: {
								recommendedApp: { name: 'Test App' },
								additionalApps: [],
								learningModules: [],
								keyInsights: [],
								dataProfile: {
									totalSourcesAnalyzed: 1,
									topProblemAreas: [],
									aiUsageLevel: 'moderate',
								},
							},
						},
					]),
				}),
			}),
		})

		const { POST } = await import('@/app/api/discovery/analyze/route')
		const req = makeJsonRequest('http://localhost/api/discovery/analyze', {
			sessionId: 'bench-session-id',
		})
		await POST(req)
	})
})
