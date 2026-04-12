import { getDb } from '@meldar/db/client'
import { discoverySessions } from '@meldar/db/schema'
import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { extractFromOcrText } from '@/server/discovery/extract-from-text'
import { extractFromScreenshot } from '@/server/discovery/extract-screenshot'
import { extractGoogleTopics, extractTopicsFromMessages } from '@/server/discovery/extract-topics'
import { extractScreenTime } from '@/server/discovery/ocr'
import {
	parseChatGptExport,
	parseClaudeExport,
	parseGoogleTakeout,
} from '@/server/discovery/parsers'
import { checkRateLimit, screentimeLimit } from '@/server/lib/rate-limit'

const platformSchema = z.enum([
	'screentime',
	'chatgpt',
	'claude',
	'google',
	'subscriptions',
	'battery',
	'storage',
	'calendar',
	'health',
	'adaptive',
])

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ZIP_SIZE = 200 * 1024 * 1024 // 200 MB
const MAX_JSON_SIZE = 50 * 1024 * 1024 // 50 MB

/**
 * Map an adaptive screenshot's app name to the best extraction source type.
 * Falls back to 'subscriptions' as a generic extractor for unknown apps.
 */
function resolveAdaptiveSourceType(appName: string | null): string {
	if (!appName) return 'subscriptions'
	const lower = appName.toLowerCase()

	const tradingApps = ['robinhood', 'etoro', 'trading 212', 'webull', 'interactive brokers']
	if (tradingApps.some((a) => lower.includes(a))) return 'subscriptions'

	const bankingApps = [
		'revolut',
		'chase',
		'n26',
		'wise',
		'venmo',
		'cash app',
		'paypal',
		'nordea',
		'op mobile',
		'op business',
		'op pivo',
		's-pankki',
		'bank of america',
	]
	if (bankingApps.some((a) => lower.includes(a))) return 'subscriptions'

	if (
		lower.includes('strava') ||
		lower.includes('nike') ||
		lower.includes('strong') ||
		lower.includes('hevy') ||
		lower.includes('fitbit') ||
		lower.includes('myfitnesspal') ||
		lower.includes('whoop')
	)
		return 'health'

	const foodApps = [
		'ubereats',
		'uber eats',
		'wolt',
		'doordash',
		'bolt food',
		'deliveroo',
		'grubhub',
	]
	if (foodApps.some((a) => lower.includes(a))) return 'subscriptions'

	if (
		lower.includes('spotify') ||
		lower.includes('apple music') ||
		lower.includes('youtube music') ||
		lower.includes('tidal') ||
		lower.includes('soundcloud')
	)
		return 'subscriptions'

	if (
		lower.includes('calendar') ||
		lower.includes('google calendar') ||
		lower.includes('outlook') ||
		lower.includes('fantastical')
	)
		return 'calendar'

	if (lower.includes('photos') || lower.includes('files') || lower.includes('dropbox'))
		return 'storage'

	return 'subscriptions'
}

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(screentimeLimit, ip)
		if (!success) {
			return NextResponse.json(
				{
					error: {
						code: 'RATE_LIMITED',
						message: 'Too many requests. Try again in a few minutes.',
					},
				},
				{ status: 429 },
			)
		}

		const formData = await request.formData()
		const file = formData.get('file') as File | null
		const ocrText = formData.get('ocrText') as string | null
		const platform = formData.get('platform') as string | null
		const sessionId = formData.get('sessionId') as string | null

		if ((!file && !ocrText) || !platform || !sessionId) {
			return NextResponse.json(
				{
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Missing file/ocrText, platform, or sessionId.',
					},
				},
				{ status: 400 },
			)
		}

		const platformParsed = platformSchema.safeParse(platform)
		if (!platformParsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Unknown platform.' } },
				{ status: 400 },
			)
		}

		const sessionIdParsed = z.string().min(1).max(32).safeParse(sessionId)
		if (!sessionIdParsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID.' } },
				{ status: 400 },
			)
		}

		const isImagePlatform =
			platform === 'screentime' ||
			platform === 'subscriptions' ||
			platform === 'battery' ||
			platform === 'storage' ||
			platform === 'calendar' ||
			platform === 'health' ||
			platform === 'adaptive'

		if (!ocrText && file) {
			if (isImagePlatform) {
				if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'File must be JPEG, PNG, or WebP.' } },
						{ status: 400 },
					)
				}
				if (file.size > MAX_IMAGE_SIZE) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'Image must be under 5 MB.' } },
						{ status: 400 },
					)
				}
			} else if (platform === 'claude') {
				if (file.size > MAX_JSON_SIZE) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'JSON file must be under 50 MB.' } },
						{ status: 400 },
					)
				}
			} else {
				if (file.size > MAX_ZIP_SIZE) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'ZIP file must be under 200 MB.' } },
						{ status: 400 },
					)
				}
			}

			const ALLOWED_ZIP_TYPES = new Set([
				'application/zip',
				'application/x-zip-compressed',
				'application/octet-stream',
			])
			const ALLOWED_JSON_TYPES = new Set(['application/json', 'text/plain'])

			if (
				(platform === 'chatgpt' || platform === 'google') &&
				!ALLOWED_ZIP_TYPES.has(file.type) &&
				!file.name.endsWith('.zip')
			) {
				return NextResponse.json(
					{ error: { code: 'VALIDATION_ERROR', message: 'File must be a ZIP archive.' } },
					{ status: 400 },
				)
			}
			if (
				platform === 'claude' &&
				!ALLOWED_JSON_TYPES.has(file.type) &&
				!file.name.endsWith('.json')
			) {
				return NextResponse.json(
					{ error: { code: 'VALIDATION_ERROR', message: 'File must be a JSON file.' } },
					{ status: 400 },
				)
			}
		} else if (ocrText && ocrText.length > 50000) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'OCR text too large.' } },
				{ status: 400 },
			)
		}

		const db = getDb()
		const [session] = await db
			.select({
				id: discoverySessions.id,
				sourcesProvided: discoverySessions.sourcesProvided,
			})
			.from(discoverySessions)
			.where(eq(discoverySessions.id, sessionId))
			.limit(1)

		if (!session) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Session not found.' } },
				{ status: 404 },
			)
		}

		// Adaptive is intentionally multi-upload, so exclude it from idempotency guard.
		if (
			platformParsed.data !== 'adaptive' &&
			session.sourcesProvided?.includes(platformParsed.data)
		) {
			return NextResponse.json({ success: true, platform: platformParsed.data, cached: true })
		}

		let updateData: Record<string, unknown> = {}

		switch (platformParsed.data) {
			case 'screentime': {
				if (ocrText) {
					const result = await extractFromOcrText(ocrText, 'screentime')
					if ('error' in result) {
						return NextResponse.json(
							{ error: { code: 'UNPROCESSABLE', message: result.error } },
							{ status: 422 },
						)
					}
					updateData = { screenTimeData: result.data }
				} else if (file) {
					const buffer = Buffer.from(await file.arrayBuffer())
					const base64 = buffer.toString('base64')
					const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
					const result = await extractScreenTime(base64, mediaType)
					if ('error' in result) {
						return NextResponse.json(
							{
								error: {
									code: 'UNPROCESSABLE',
									message: `Could not process screenshot: ${result.error}`,
								},
							},
							{ status: 422 },
						)
					}
					updateData = { screenTimeData: result.data }
				}
				break
			}
			case 'chatgpt': {
				if (!file) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'File required for ChatGPT export.' } },
						{ status: 400 },
					)
				}
				const parsed = await parseChatGptExport(file)
				// Extract topics via Haiku BEFORE stripping raw messages
				const topics = await extractTopicsFromMessages(parsed._rawMessages, 'ChatGPT')
				const { _rawMessages, ...persistable } = parsed
				updateData = {
					chatgptData: {
						...persistable,
						topTopics: topics.topTopics,
						repeatedQuestions: topics.repeatedQuestions,
					},
				}
				break
			}
			case 'claude': {
				if (!file) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'File required for Claude export.' } },
						{ status: 400 },
					)
				}
				const parsed = await parseClaudeExport(file)
				const topics = await extractTopicsFromMessages(parsed._rawMessages, 'Claude')
				const { _rawMessages, ...persistable } = parsed
				updateData = {
					claudeData: {
						...persistable,
						topTopics: topics.topTopics,
						repeatedQuestions: topics.repeatedQuestions,
					},
				}
				break
			}
			case 'google': {
				if (!file) {
					return NextResponse.json(
						{ error: { code: 'VALIDATION_ERROR', message: 'File required for Google Takeout.' } },
						{ status: 400 },
					)
				}
				const parsed = await parseGoogleTakeout(file)
				const googleTopics = await extractGoogleTopics(
					parsed._rawSearches,
					parsed._rawYoutubeWatches,
				)
				const { _rawSearches, _rawYoutubeWatches, ...persistable } = parsed
				updateData = {
					googleData: {
						...persistable,
						searchTopics: googleTopics.searchTopics,
						youtubeTopCategories:
							googleTopics.youtubeTopCategories.length > 0
								? googleTopics.youtubeTopCategories
								: null,
					},
				}
				break
			}
			case 'subscriptions':
			case 'battery':
			case 'storage':
			case 'calendar':
			case 'health': {
				let result: { data: unknown } | { error: string }

				if (ocrText) {
					result = await extractFromOcrText(ocrText, platformParsed.data)
				} else if (file) {
					const buffer = Buffer.from(await file.arrayBuffer())
					const base64 = buffer.toString('base64')
					const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
					result = await extractFromScreenshot(base64, mediaType, platformParsed.data)
				} else {
					result = { error: 'No file or OCR text provided' }
				}

				if ('error' in result) {
					return NextResponse.json(
						{
							error: {
								code: 'UNPROCESSABLE',
								message: `Could not process screenshot: ${result.error}`,
							},
						},
						{ status: 422 },
					)
				}

				const dataKey = `${platformParsed.data}Data` as const
				updateData = { [dataKey]: result.data }
				break
			}
			case 'adaptive': {
				const adaptiveAppName = formData.get('appName') as string | null
				const sourceType = resolveAdaptiveSourceType(adaptiveAppName)

				let result: { data: unknown } | { error: string }
				if (ocrText) {
					result = await extractFromOcrText(ocrText, sourceType)
				} else if (file) {
					const buffer = Buffer.from(await file.arrayBuffer())
					const base64 = buffer.toString('base64')
					const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
					result = await extractFromScreenshot(base64, mediaType, sourceType)
				} else {
					result = { error: 'No file or OCR text provided' }
				}

				if ('error' in result) {
					return NextResponse.json(
						{
							error: {
								code: 'UNPROCESSABLE',
								message: `Could not process screenshot: ${result.error}`,
							},
						},
						{ status: 422 },
					)
				}

				// Atomic JSONB append to avoid race condition on concurrent uploads
				const newEntry = JSON.stringify([
					{ appName: adaptiveAppName, sourceType, extraction: result.data },
				])
				await db
					.update(discoverySessions)
					.set({
						adaptiveData: sql`COALESCE(${discoverySessions.adaptiveData}, '[]'::jsonb) || ${newEntry}::jsonb`,
						sourcesProvided: sql`array_append(${discoverySessions.sourcesProvided}, ${platformParsed.data})`,
						updatedAt: new Date(),
					})
					.where(eq(discoverySessions.id, sessionId))

				return NextResponse.json({ success: true, platform: platformParsed.data })
			}
		}

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(
				{ error: { code: 'INTERNAL_ERROR', message: 'Unknown platform handler.' } },
				{ status: 500 },
			)
		}

		await db
			.update(discoverySessions)
			.set({
				...updateData,
				sourcesProvided: sql`array_append(${discoverySessions.sourcesProvided}, ${platformParsed.data})`,
				updatedAt: new Date(),
			})
			.where(eq(discoverySessions.id, sessionId))

		const extractedPreview = Object.values(updateData)[0]
		return NextResponse.json({
			success: true,
			platform: platformParsed.data,
			preview: extractedPreview,
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		console.error('Upload processing failed:', message)

		if (
			message.includes('invalid JSON') ||
			message.includes('not an array') ||
			message.includes('No conversations.json') ||
			message.includes('valid ChatGPT') ||
			message.includes('valid Claude') ||
			message.includes('Archive too large')
		) {
			return NextResponse.json({ error: { code: 'UNPROCESSABLE', message } }, { status: 422 })
		}

		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Upload processing failed. Please try again.' } },
			{ status: 500 },
		)
	}
}
