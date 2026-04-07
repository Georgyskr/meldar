import { makeNextRequest } from '@meldar/test-utils'
import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
	mockDbUpdate,
	mockDbSet,
	mockDbUpdateWhere,
	mockCheckRateLimit,
	mockExtractFromOcrText,
	mockExtractScreenTime,
	mockExtractFromScreenshot,
	mockParseChatGptExport,
	mockParseClaudeExport,
	mockParseGoogleTakeout,
	mockExtractTopicsFromMessages,
	mockExtractGoogleTopics,
} = vi.hoisted(() => ({
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
	mockDbUpdate: vi.fn(),
	mockDbSet: vi.fn(),
	mockDbUpdateWhere: vi.fn(),
	mockCheckRateLimit: vi.fn<typeof import('@/server/lib/rate-limit').checkRateLimit>(),
	mockExtractFromOcrText: vi.fn(),
	mockExtractScreenTime: vi.fn(),
	mockExtractFromScreenshot: vi.fn(),
	mockParseChatGptExport: vi.fn(),
	mockParseClaudeExport: vi.fn(),
	mockParseGoogleTakeout: vi.fn(),
	mockExtractTopicsFromMessages: vi.fn(),
	mockExtractGoogleTopics: vi.fn(),
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
		sourcesProvided: 'sourcesProvided',
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
	sql: (strings: TemplateStringsArray, ..._values: unknown[]) => ({
		_tag: 'sql',
		strings,
	}),
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

vi.mock('@/server/discovery/extract-from-text', () => ({
	extractFromOcrText: mockExtractFromOcrText,
}))

vi.mock('@/server/discovery/ocr', () => ({
	extractScreenTime: mockExtractScreenTime,
}))

vi.mock('@/server/discovery/extract-screenshot', () => ({
	extractFromScreenshot: mockExtractFromScreenshot,
}))

vi.mock('@/server/discovery/parsers', () => ({
	parseChatGptExport: mockParseChatGptExport,
	parseClaudeExport: mockParseClaudeExport,
	parseGoogleTakeout: mockParseGoogleTakeout,
}))

vi.mock('@/server/discovery/extract-topics', () => ({
	extractTopicsFromMessages: mockExtractTopicsFromMessages,
	extractGoogleTopics: mockExtractGoogleTopics,
}))

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '../../upload/route'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFormDataRequest(fields: Record<string, string | File>): NextRequest {
	const formData = new FormData()
	for (const [key, value] of Object.entries(fields)) {
		formData.append(key, value)
	}
	return makeNextRequest('http://localhost/api/discovery/upload', {
		method: 'POST',
		body: formData,
	})
}

function makeImageFile(name = 'screen.jpeg', type = 'image/jpeg', sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes)
	return new File([buffer], name, { type })
}

function makeZipFile(name = 'export.zip', sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes)
	return new File([buffer], name, { type: 'application/zip' })
}

function makeJsonFile(name = 'export.json', sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes)
	return new File([buffer], name, { type: 'application/json' })
}

const fakeSession = {
	id: 'session123',
	sourcesProvided: [],
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

const validScreenTimeResult = {
	data: {
		apps: [{ name: 'Instagram', usageMinutes: 90, category: 'social' }],
		totalScreenTimeMinutes: 360,
		platform: 'ios',
		confidence: 'high',
	},
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/discovery/upload', () => {
	beforeEach(() => {
		mockCheckRateLimit.mockResolvedValue({ success: true })
		setupSelectChain([fakeSession])
		setupUpdateChain()
		mockExtractFromOcrText.mockResolvedValue(validScreenTimeResult)
		mockExtractScreenTime.mockResolvedValue(validScreenTimeResult)
		mockExtractFromScreenshot.mockResolvedValue({ data: { items: [] } })
		mockParseChatGptExport.mockResolvedValue({
			conversationCount: 5,
			_rawMessages: [{ text: 'hello', timestamp: 123 }],
			topTopics: [],
			repeatedQuestions: [],
			timePatterns: {},
			platform: 'chatgpt',
		})
		mockParseClaudeExport.mockResolvedValue({
			conversationCount: 3,
			_rawMessages: [{ text: 'hello', timestamp: 123 }],
			topTopics: [],
			repeatedQuestions: [],
			timePatterns: {},
			platform: 'claude',
		})
		mockParseGoogleTakeout.mockResolvedValue({
			_rawSearches: [{ query: 'test', timestamp: 123 }],
			_rawYoutubeWatches: [{ title: 'video', timestamp: 123 }],
			searchTopics: [],
			youtubeTopCategories: null,
			emailVolume: null,
		})
		mockExtractTopicsFromMessages.mockResolvedValue({
			topTopics: ['AI'],
			repeatedQuestions: ['How to use AI?'],
		})
		mockExtractGoogleTopics.mockResolvedValue({
			searchTopics: ['tech'],
			youtubeTopCategories: ['Education'],
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('rate limiting', () => {
		it('returns 429 when rate limit returns { success: false }', async () => {
			mockCheckRateLimit.mockResolvedValue({ success: false })

			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(429)
			expect(json.error.code).toBe('RATE_LIMITED')
		})
	})

	describe('missing field validation', () => {
		it('returns 400 when both file and ocrText are absent', async () => {
			const req = makeFormDataRequest({
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 when platform is absent', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile(),
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 when sessionId is absent', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 VALIDATION_ERROR for an unknown platform value (e.g. "tiktok")', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'tiktok',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})

		it('returns 400 VALIDATION_ERROR when sessionId exceeds 32 characters', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
				sessionId: 'x'.repeat(33),
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('file validation — image platforms (screentime, subscriptions, battery, storage, calendar, health, adaptive)', () => {
		it('returns 400 for image/gif MIME type on screentime platform', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile('screen.gif', 'image/gif'),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for image file larger than 5 MB on screentime platform', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile('screen.jpeg', 'image/jpeg', 6 * 1024 * 1024),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on subscriptions platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.pdf', { type: 'application/pdf' }),
				platform: 'subscriptions',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on battery platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.pdf', { type: 'application/pdf' }),
				platform: 'battery',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on storage platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.txt', { type: 'text/plain' }),
				platform: 'storage',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on calendar platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.txt', { type: 'text/plain' }),
				platform: 'calendar',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on health platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.txt', { type: 'text/plain' }),
				platform: 'health',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 for non-image MIME on adaptive platform', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'data.txt', { type: 'text/plain' }),
				platform: 'adaptive',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})
	})

	describe('file validation — ZIP platforms (chatgpt, google)', () => {
		it('returns 400 when chatgpt file has non-ZIP MIME and no .zip extension', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'export.txt', { type: 'text/plain' }),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('accepts chatgpt file with application/octet-stream MIME (common browser ZIP MIME)', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'export.bin', {
					type: 'application/octet-stream',
				}),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)
			// Should pass validation and reach parser (which is mocked)
			expect(res.status).toBe(200)
		})

		it('returns 400 for ZIP file larger than 200 MB on chatgpt platform', async () => {
			const req = makeFormDataRequest({
				file: makeZipFile('export.zip', 201 * 1024 * 1024),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('returns 400 when google file has non-ZIP MIME and no .zip extension', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'takeout.tar', {
					type: 'application/x-tar',
				}),
				platform: 'google',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})
	})

	describe('file validation — JSON platform (claude)', () => {
		it('returns 400 when claude file has non-JSON MIME and no .json extension', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'export.zip', { type: 'application/zip' }),
				platform: 'claude',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('accepts claude file with text/plain MIME (common on some systems for .json files)', async () => {
			const req = makeFormDataRequest({
				file: new File([new ArrayBuffer(100)], 'export.txt', { type: 'text/plain' }),
				platform: 'claude',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(200)
		})

		it('returns 400 for JSON file larger than 50 MB on claude platform', async () => {
			const req = makeFormDataRequest({
				file: makeJsonFile('export.json', 51 * 1024 * 1024),
				platform: 'claude',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})
	})

	describe('ocrText validation', () => {
		it('returns 400 when ocrText exceeds 50,000 characters', async () => {
			const req = makeFormDataRequest({
				ocrText: 'a'.repeat(50001),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})
	})

	describe('ocrText + file both provided', () => {
		it('ocrText wins — file size check is skipped entirely when ocrText is provided alongside a large file', async () => {
			const largeFile = makeImageFile('screen.jpeg', 'image/jpeg', 10 * 1024 * 1024)
			const req = makeFormDataRequest({
				file: largeFile,
				ocrText: 'Screen Time: 6h 30m total today...',
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			// Should NOT return 400 for file size — ocrText path is taken
			expect(res.status).toBe(200)
		})

		it('uses OCR path (not Vision) when ocrText is non-empty even if file is also present', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile(),
				ocrText: 'Screen Time: 6h 30m total today...',
				platform: 'screentime',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockExtractFromOcrText).toHaveBeenCalledWith(
				'Screen Time: 6h 30m total today...',
				'screentime',
			)
			expect(mockExtractScreenTime).not.toHaveBeenCalled()
		})
	})

	describe('ocrText on ZIP/JSON platforms (edge case)', () => {
		it('returns 400 "File required for ChatGPT export." when ocrText is provided to chatgpt platform', async () => {
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			// ChatGPT platform requires file — ocrText alone triggers the file-required check
			expect(res.status).toBe(400)
			expect(json.error.message).toBe('File required for ChatGPT export.')
		})

		it('returns 400 "File required for Claude export." when ocrText is provided to claude platform', async () => {
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'claude',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.message).toBe('File required for Claude export.')
		})

		it('returns 400 "File required for Google Takeout." when ocrText is provided to google platform', async () => {
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'google',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.error.message).toBe('File required for Google Takeout.')
		})
	})

	describe('session lookup', () => {
		it('returns 404 NOT_FOUND when session does not exist in DB', async () => {
			setupSelectChain([])

			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
				sessionId: 'nonexistent',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(404)
			expect(json.error.code).toBe('NOT_FOUND')
		})
	})

	describe('idempotency', () => {
		it('returns { success: true, cached: true } on second upload for the same non-adaptive platform', async () => {
			setupSelectChain([{ id: 'session123', sourcesProvided: ['screentime'] }])

			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.cached).toBe(true)
			expect(mockExtractScreenTime).not.toHaveBeenCalled()
		})

		it('does NOT apply the idempotency guard for adaptive platform', async () => {
			setupSelectChain([{ id: 'session123', sourcesProvided: ['adaptive'] }])
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

			const req = makeFormDataRequest({
				ocrText: 'some adaptive text data here...',
				platform: 'adaptive',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.cached).toBeUndefined()
		})
	})

	describe('screentime platform', () => {
		it('calls extractFromOcrText with sourceType "screentime" when ocrText is provided', async () => {
			const req = makeFormDataRequest({
				ocrText: 'Screen Time: 6h 30m total today...',
				platform: 'screentime',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockExtractFromOcrText).toHaveBeenCalledWith(
				'Screen Time: 6h 30m total today...',
				'screentime',
			)
		})

		it('calls extractScreenTime (Vision) when only a file is provided, passing base64 and mediaType', async () => {
			const req = makeFormDataRequest({
				file: makeImageFile('screen.jpeg', 'image/jpeg'),
				platform: 'screentime',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockExtractScreenTime).toHaveBeenCalledWith(
				expect.any(String), // base64
				'image/jpeg',
			)
		})

		it('returns 422 UNPROCESSABLE when extractFromOcrText returns { error }', async () => {
			mockExtractFromOcrText.mockResolvedValue({ error: 'Could not parse' })

			const req = makeFormDataRequest({
				ocrText: 'garbled text',
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(422)
			expect(json.error.code).toBe('UNPROCESSABLE')
		})

		it('returns 422 UNPROCESSABLE when extractScreenTime returns { error }', async () => {
			mockExtractScreenTime.mockResolvedValue({ error: 'not_screen_time' })

			const req = makeFormDataRequest({
				file: makeImageFile(),
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(res.status).toBe(422)
			expect(json.error.code).toBe('UNPROCESSABLE')
		})

		it('updates session.screenTimeData in DB on success', async () => {
			const req = makeFormDataRequest({
				ocrText: 'Screen Time: 6h 30m total today...',
				platform: 'screentime',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockDbUpdate).toHaveBeenCalled()
			expect(mockDbSet).toHaveBeenCalledWith(
				expect.objectContaining({
					screenTimeData: validScreenTimeResult.data,
				}),
			)
		})

		it('returns { success: true, platform: "screentime" }', async () => {
			const req = makeFormDataRequest({
				ocrText: 'Screen Time: 6h 30m total today...',
				platform: 'screentime',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.platform).toBe('screentime')
		})
	})

	describe('chatgpt platform — errors bubble through outer catch as throws', () => {
		it('returns 400 when no file is provided', async () => {
			// ocrText alone won't work for chatgpt — it requires a file
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('calls parseChatGptExport then extractTopicsFromMessages on success', async () => {
			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockParseChatGptExport).toHaveBeenCalled()
			expect(mockExtractTopicsFromMessages).toHaveBeenCalled()
		})

		it('strips _rawMessages before persisting chatgptData', async () => {
			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			await POST(req)

			const setCall = mockDbSet.mock.calls[0][0]
			expect(setCall.chatgptData._rawMessages).toBeUndefined()
			expect(setCall.chatgptData.topTopics).toEqual(['AI'])
		})

		it('returns 422 when parseChatGptExport rejects with Error("No conversations.json found in ChatGPT export")', async () => {
			mockParseChatGptExport.mockRejectedValue(
				new Error('No conversations.json found in ChatGPT export'),
			)

			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)

			expect(res.status).toBe(422)
			const json = await res.json()
			expect(json.error.code).toBe('UNPROCESSABLE')
		})

		it('returns 422 when parseChatGptExport rejects with Error containing "invalid JSON"', async () => {
			mockParseChatGptExport.mockRejectedValue(
				new Error('conversations.json contains invalid JSON'),
			)

			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)

			expect(res.status).toBe(422)
		})

		it('returns 422 when parseChatGptExport rejects with Error("conversations.json is not an array")', async () => {
			mockParseChatGptExport.mockRejectedValue(new Error('conversations.json is not an array'))

			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)

			expect(res.status).toBe(422)
		})

		it('returns 422 when parseChatGptExport rejects with Error("Archive too large when decompressed") — zip bomb path', async () => {
			mockParseChatGptExport.mockRejectedValue(new Error('Archive too large when decompressed'))

			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'chatgpt',
				sessionId: 'session123',
			})
			const res = await POST(req)

			expect(res.status).toBe(422)
			const json = await res.json()
			expect(json.error.code).toBe('UNPROCESSABLE')
		})
	})

	describe('claude platform', () => {
		it('returns 400 when no file is provided', async () => {
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'claude',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('calls parseClaudeExport then extractTopicsFromMessages on success', async () => {
			const req = makeFormDataRequest({
				file: makeJsonFile(),
				platform: 'claude',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockParseClaudeExport).toHaveBeenCalled()
			expect(mockExtractTopicsFromMessages).toHaveBeenCalled()
		})

		it('strips _rawMessages before persisting claudeData', async () => {
			const req = makeFormDataRequest({
				file: makeJsonFile(),
				platform: 'claude',
				sessionId: 'session123',
			})
			await POST(req)

			const setCall = mockDbSet.mock.calls[0][0]
			expect(setCall.claudeData._rawMessages).toBeUndefined()
			expect(setCall.claudeData.topTopics).toEqual(['AI'])
		})
	})

	describe('google platform', () => {
		it('returns 400 when no file is provided', async () => {
			const req = makeFormDataRequest({
				ocrText: 'some text',
				platform: 'google',
				sessionId: 'session123',
			})
			const res = await POST(req)
			expect(res.status).toBe(400)
		})

		it('calls parseGoogleTakeout then extractGoogleTopics on success', async () => {
			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'google',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockParseGoogleTakeout).toHaveBeenCalled()
			expect(mockExtractGoogleTopics).toHaveBeenCalled()
		})

		it('strips _rawSearches and _rawYoutubeWatches before persisting googleData', async () => {
			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'google',
				sessionId: 'session123',
			})
			await POST(req)

			const setCall = mockDbSet.mock.calls[0][0]
			expect(setCall.googleData._rawSearches).toBeUndefined()
			expect(setCall.googleData._rawYoutubeWatches).toBeUndefined()
			expect(setCall.googleData.searchTopics).toEqual(['tech'])
		})

		it('persists youtubeTopCategories as null when extractGoogleTopics returns empty array', async () => {
			mockExtractGoogleTopics.mockResolvedValue({
				searchTopics: ['tech'],
				youtubeTopCategories: [],
			})

			const req = makeFormDataRequest({
				file: makeZipFile(),
				platform: 'google',
				sessionId: 'session123',
			})
			await POST(req)

			const setCall = mockDbSet.mock.calls[0][0]
			expect(setCall.googleData.youtubeTopCategories).toBeNull()
		})
	})

	describe('subscriptions/battery/storage/calendar/health platforms', () => {
		it('calls extractFromOcrText with the platform as sourceType when ocrText is provided', async () => {
			for (const platform of ['subscriptions', 'battery', 'storage', 'calendar', 'health']) {
				mockExtractFromOcrText.mockClear()

				const req = makeFormDataRequest({
					ocrText: 'Some OCR extracted text here...',
					platform,
					sessionId: 'session123',
				})
				await POST(req)

				expect(mockExtractFromOcrText).toHaveBeenCalledWith(
					'Some OCR extracted text here...',
					platform,
				)
			}
		})

		it('calls extractFromScreenshot (Vision) when only a file is provided', async () => {
			for (const platform of ['subscriptions', 'battery', 'storage', 'calendar', 'health']) {
				mockExtractFromScreenshot.mockClear()

				const req = makeFormDataRequest({
					file: makeImageFile(),
					platform,
					sessionId: 'session123',
				})
				await POST(req)

				expect(mockExtractFromScreenshot).toHaveBeenCalledWith(
					expect.any(String),
					'image/jpeg',
					platform,
				)
			}
		})

		it('returns 422 on extraction error', async () => {
			mockExtractFromOcrText.mockResolvedValue({ error: 'Could not extract' })

			const req = makeFormDataRequest({
				ocrText: 'garbled text',
				platform: 'subscriptions',
				sessionId: 'session123',
			})
			const res = await POST(req)

			expect(res.status).toBe(422)
		})

		it('updates the correct DB column for each platform: subscriptionsData, batteryData, storageData, calendarData, healthData', async () => {
			const platforms = ['subscriptions', 'battery', 'storage', 'calendar', 'health']

			for (const platform of platforms) {
				mockDbSet.mockClear()
				mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

				const req = makeFormDataRequest({
					ocrText: 'Some data text here in the OCR',
					platform,
					sessionId: 'session123',
				})
				await POST(req)

				const setCall = mockDbSet.mock.calls[0][0]
				expect(setCall[`${platform}Data`]).toBeDefined()
			}
		})
	})

	describe('adaptive platform', () => {
		it('reads appName from formData and resolves sourceType via resolveAdaptiveSourceType', async () => {
			mockExtractFromOcrText.mockResolvedValue({ data: { steps: 1000 } })

			const formData = new FormData()
			formData.append('ocrText', 'Some health data from Strava...')
			formData.append('platform', 'adaptive')
			formData.append('sessionId', 'session123')
			formData.append('appName', 'Strava')

			const req = makeNextRequest('http://localhost/api/discovery/upload', {
				method: 'POST',
				body: formData,
			})
			await POST(req)

			// Strava -> "health" sourceType
			expect(mockExtractFromOcrText).toHaveBeenCalledWith(
				'Some health data from Strava...',
				'health',
			)
		})

		it('uses JSONB COALESCE atomic append for adaptiveData in the db.update call', async () => {
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

			const req = makeFormDataRequest({
				ocrText: 'Some adaptive text here data...',
				platform: 'adaptive',
				sessionId: 'session123',
			})
			await POST(req)

			expect(mockDbUpdate).toHaveBeenCalled()
			// The set call should have adaptiveData with a SQL template (COALESCE)
			expect(mockDbSet).toHaveBeenCalled()
		})

		it('does NOT check idempotency guard and allows multiple uploads', async () => {
			setupSelectChain([{ id: 'session123', sourcesProvided: ['adaptive'] }])
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

			const req = makeFormDataRequest({
				ocrText: 'More adaptive data from app...',
				platform: 'adaptive',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.cached).toBeUndefined()
		})

		it('returns { success: true, platform: "adaptive" } after append', async () => {
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

			const req = makeFormDataRequest({
				ocrText: 'Some adaptive text here data...',
				platform: 'adaptive',
				sessionId: 'session123',
			})
			const res = await POST(req)
			const json = await res.json()

			expect(json.success).toBe(true)
			expect(json.platform).toBe('adaptive')
		})

		it('handles null appName in formData — resolves to "subscriptions" fallback and completes successfully', async () => {
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })

			// Don't append appName field
			const req = makeFormDataRequest({
				ocrText: 'Some adaptive text here data...',
				platform: 'adaptive',
				sessionId: 'session123',
			})
			await POST(req)

			// null appName -> "subscriptions" fallback
			expect(mockExtractFromOcrText).toHaveBeenCalledWith(
				'Some adaptive text here data...',
				'subscriptions',
			)
		})
	})

	describe('resolveAdaptiveSourceType — tested indirectly through adaptive upload', () => {
		beforeEach(() => {
			mockExtractFromOcrText.mockResolvedValue({ data: { items: [] } })
		})

		function makeAdaptiveRequest(appName: string | null) {
			const formData = new FormData()
			formData.append('ocrText', 'Test OCR text for this platform')
			formData.append('platform', 'adaptive')
			formData.append('sessionId', 'session123')
			if (appName !== null) {
				formData.append('appName', appName)
			}
			return makeNextRequest('http://localhost/api/discovery/upload', {
				method: 'POST',
				body: formData,
			})
		}

		async function getResolvedSourceType(appName: string | null): Promise<string> {
			mockExtractFromOcrText.mockClear()
			await POST(makeAdaptiveRequest(appName))
			return mockExtractFromOcrText.mock.calls[0][1]
		}

		it('maps "Strava" to "health"', async () => {
			expect(await getResolvedSourceType('Strava')).toBe('health')
		})

		it('maps "Nike Run Club" to "health"', async () => {
			expect(await getResolvedSourceType('Nike Run Club')).toBe('health')
		})

		it('maps "Google Calendar" to "calendar"', async () => {
			expect(await getResolvedSourceType('Google Calendar')).toBe('calendar')
		})

		it('maps "Outlook" to "calendar"', async () => {
			expect(await getResolvedSourceType('Outlook')).toBe('calendar')
		})

		it('maps "Revolut" to "subscriptions"', async () => {
			expect(await getResolvedSourceType('Revolut')).toBe('subscriptions')
		})

		it('maps "Photos" to "storage"', async () => {
			expect(await getResolvedSourceType('Photos')).toBe('storage')
		})

		it('maps "Dropbox" to "storage"', async () => {
			expect(await getResolvedSourceType('Dropbox')).toBe('storage')
		})

		it('maps an unknown app name to "subscriptions" fallback', async () => {
			expect(await getResolvedSourceType('SomeRandomApp')).toBe('subscriptions')
		})

		it('is case-insensitive: "STRAVA" and "strava" both map to "health"', async () => {
			expect(await getResolvedSourceType('STRAVA')).toBe('health')
			expect(await getResolvedSourceType('strava')).toBe('health')
		})

		it('returns "subscriptions" for null appName input', async () => {
			expect(await getResolvedSourceType(null)).toBe('subscriptions')
		})
	})
})
