import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import { extractScreenTime } from '@/server/discovery/ocr'
import {
	parseChatGptExport,
	parseClaudeExport,
	parseGoogleTakeout,
} from '@/server/discovery/parsers'
import { checkRateLimit, screentimeLimit } from '@/server/lib/rate-limit'

const platformSchema = z.enum(['screentime', 'chatgpt', 'claude', 'google'])

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ZIP_SIZE = 200 * 1024 * 1024 // 200 MB
const MAX_JSON_SIZE = 50 * 1024 * 1024 // 50 MB

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
		const platform = formData.get('platform') as string | null
		const sessionId = formData.get('sessionId') as string | null

		if (!file || !platform || !sessionId) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Missing file, platform, or sessionId.' } },
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

		// Validate file size per platform
		if (platform === 'screentime') {
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

		// Verify session exists
		const db = getDb()
		const [session] = await db
			.select({ id: discoverySessions.id })
			.from(discoverySessions)
			.where(eq(discoverySessions.id, sessionId))
			.limit(1)

		if (!session) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Session not found.' } },
				{ status: 404 },
			)
		}

		// Route to correct parser
		// C2: MIME validation for non-screentime uploads
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

		// H1: Validate sessionId format
		const sessionIdParsed = z.string().min(1).max(32).safeParse(sessionId)
		if (!sessionIdParsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID.' } },
				{ status: 400 },
			)
		}

		let updateData: Record<string, unknown> = {}

		switch (platformParsed.data) {
			case 'screentime': {
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
				break
			}
			case 'chatgpt': {
				const parsed = await parseChatGptExport(file)
				const { _rawMessages, ...persistable } = parsed
				updateData = { chatgptData: persistable }
				break
			}
			case 'claude': {
				const parsed = await parseClaudeExport(file)
				const { _rawMessages, ...persistable } = parsed
				updateData = { claudeData: persistable }
				break
			}
			case 'google': {
				const parsed = await parseGoogleTakeout(file)
				const { _rawSearches, _rawYoutubeWatches, ...persistable } = parsed
				updateData = { googleData: persistable }
				break
			}
		}

		// C4: Guard against empty updateData
		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(
				{ error: { code: 'INTERNAL_ERROR', message: 'Unknown platform handler.' } },
				{ status: 500 },
			)
		}

		// Update session with parsed data and add platform to sourcesProvided
		const [current] = await db
			.select({ sourcesProvided: discoverySessions.sourcesProvided })
			.from(discoverySessions)
			.where(eq(discoverySessions.id, sessionId))
			.limit(1)

		const sources = new Set(current?.sourcesProvided ?? [])
		sources.add(platformParsed.data)

		await db
			.update(discoverySessions)
			.set({
				...updateData,
				sourcesProvided: [...sources],
				updatedAt: new Date(),
			})
			.where(eq(discoverySessions.id, sessionId))

		return NextResponse.json({ success: true, platform: platformParsed.data })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		console.error('Upload processing failed:', message)

		// H3: Return specific error for parse failures
		if (
			message.includes('invalid JSON') ||
			message.includes('not an array') ||
			message.includes('No conversations.json') ||
			message.includes('valid ChatGPT') ||
			message.includes('valid Claude')
		) {
			return NextResponse.json({ error: { code: 'UNPROCESSABLE', message } }, { status: 422 })
		}

		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Upload processing failed. Please try again.' } },
			{ status: 500 },
		)
	}
}
