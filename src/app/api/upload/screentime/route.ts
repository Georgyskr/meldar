import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/server/db/client'
import { xrayResults } from '@/server/db/schema'
import { generateInsights } from '@/server/discovery/insights'
import { extractScreenTime } from '@/server/discovery/ocr'
import { mapToPainPoints } from '@/server/discovery/suggestions'
import { generateUpsells } from '@/server/discovery/upsells'
import { checkRateLimit, screentimeLimit } from '@/server/lib/rate-limit'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
	try {
		// Rate limit check
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

		// Check focus mode cookie
		const focusMode = request.cookies.get('meldar-focus')?.value === '1'

		const formData = await request.formData()
		const file = formData.get('screenshot') as File | null

		if (!file) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } },
				{ status: 400 },
			)
		}

		if (!ALLOWED_TYPES.has(file.type)) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'File must be JPEG, PNG, or WebP' } },
				{ status: 400 },
			)
		}

		if (file.size > MAX_SIZE) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'File must be under 5 MB' } },
				{ status: 400 },
			)
		}

		// Convert to base64 for Claude Vision
		const buffer = Buffer.from(await file.arrayBuffer())
		const base64 = buffer.toString('base64')
		const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

		// Extract screen time data via Claude Vision
		const result = await extractScreenTime(base64, mediaType, { focusMode })

		if ('error' in result) {
			const errorKey = result.error
			const messages: Record<string, string> = {
				not_screen_time:
					"That doesn't look like a Screen Time screenshot. Try a screenshot from Settings → Screen Time.",
				unreadable: "We couldn't read that image. Try a clearer screenshot.",
			}
			return NextResponse.json(
				{
					error: {
						code: 'UNPROCESSABLE',
						message: messages[errorKey] || 'Could not process image',
					},
				},
				{ status: 422 },
			)
		}

		const extraction = result.data

		// Generate rule-based insights and upsells (zero AI cost)
		const insights = generateInsights(extraction, { focusMode })
		const upsells = generateUpsells(extraction)
		const painPoints = mapToPainPoints(extraction)

		// Save to DB for shareable URL
		const id = nanoid(12)
		const totalHours = Math.round((extraction.totalScreenTimeMinutes / 60) * 10) / 10
		const topApp = extraction.apps[0]?.name || 'Unknown'
		const insightText = insights[0]?.headline || `${totalHours} hours of screen time`

		const db = getDb()
		await db.insert(xrayResults).values({
			id,
			apps: extraction.apps,
			totalHours,
			topApp,
			pickups: extraction.pickups,
			insight: insightText,
			suggestions: painPoints,
		})

		return NextResponse.json({
			id,
			extraction,
			insights,
			upsells,
			painPoints,
		})
	} catch (err) {
		console.error(
			'Screenshot analysis failed:',
			err instanceof Error ? err.message : 'Unknown error',
		)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Analysis failed. Please try again.' } },
			{ status: 500 },
		)
	}
}
