import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import { checkRateLimit, quizLimit } from '@/server/lib/rate-limit'

const createSessionSchema = z.object({
	quizPicks: z.array(z.string()).min(1).max(12),
	aiComfort: z.number().int().min(1).max(4),
	aiToolsUsed: z.array(z.string()).max(10),
})

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(quizLimit, ip)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' } },
				{ status: 429 },
			)
		}

		const body = await request.json()
		const parsed = createSessionSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { quizPicks, aiComfort, aiToolsUsed } = parsed.data
		const id = nanoid(16)

		const db = getDb()
		await db.insert(discoverySessions).values({
			id,
			quizPicks,
			aiComfort,
			aiToolsUsed,
		})

		return NextResponse.json({ sessionId: id })
	} catch (err) {
		console.error('Create session failed:', err instanceof Error ? err.message : 'Unknown error')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create session.' } },
			{ status: 500 },
		)
	}
}
