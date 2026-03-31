import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import { generateAdaptiveFollowUps } from '@/server/discovery/adaptive'
import { adaptiveLimit, checkRateLimit } from '@/server/lib/rate-limit'

const adaptiveSchema = z.object({
	sessionId: z.string().min(1).max(32),
})

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(adaptiveLimit, ip)
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

		const body = await request.json()
		const parsed = adaptiveSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { sessionId } = parsed.data
		const db = getDb()

		const [session] = await db
			.select({
				id: discoverySessions.id,
				screenTimeData: discoverySessions.screenTimeData,
				occupation: discoverySessions.occupation,
				ageBracket: discoverySessions.ageBracket,
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

		const screenTime = session.screenTimeData as ScreenTimeExtraction | null
		if (!screenTime?.apps?.length) {
			return NextResponse.json(
				{
					error: {
						code: 'MISSING_DATA',
						message: 'Screen time data is required for adaptive follow-ups.',
					},
				},
				{ status: 400 },
			)
		}

		const followUps = await generateAdaptiveFollowUps({
			screenTimeApps: screenTime.apps.map((a) => ({
				name: a.name,
				usageMinutes: a.usageMinutes,
				category: a.category,
			})),
			occupation: session.occupation ?? 'unknown',
			ageBracket: session.ageBracket ?? 'unknown',
		})

		return NextResponse.json({ followUps })
	} catch (err) {
		console.error(
			'Adaptive follow-up failed:',
			err instanceof Error ? err.message : 'Unknown error',
		)
		return NextResponse.json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Failed to generate follow-ups. Please try again.',
				},
			},
			{ status: 500 },
		)
	}
}
