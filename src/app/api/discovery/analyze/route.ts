import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import { type AnalysisInput, runCrossAnalysis } from '@/server/discovery/analyze'
import type { AiChatParseResult, GoogleParseResult } from '@/server/discovery/parsers/types'
import { analyzeLimit, checkRateLimit } from '@/server/lib/rate-limit'

const analyzeSchema = z.object({
	sessionId: z.string().min(1).max(32),
})

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(analyzeLimit, ip)
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
		const parsed = analyzeSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
				{ status: 400 },
			)
		}

		const { sessionId } = parsed.data
		const db = getDb()

		const [session] = await db
			.select()
			.from(discoverySessions)
			.where(eq(discoverySessions.id, sessionId))
			.limit(1)

		if (!session) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Session not found.' } },
				{ status: 404 },
			)
		}

		// Don't re-run analysis if already done
		if (session.analysis) {
			return NextResponse.json({
				success: true,
				analysis: session.analysis,
				sessionId,
			})
		}

		const input: AnalysisInput = {
			quizPicks: session.quizPicks ?? [],
			aiComfort: session.aiComfort ?? 1,
			aiToolsUsed: session.aiToolsUsed ?? [],
			screenTime: session.screenTimeData as ScreenTimeExtraction | undefined,
			chatgptData: session.chatgptData as AiChatParseResult | undefined,
			claudeData: session.claudeData as AiChatParseResult | undefined,
			googleData: session.googleData as GoogleParseResult | undefined,
		}

		const analysis = await runCrossAnalysis(input)

		// Save analysis to session
		await db
			.update(discoverySessions)
			.set({
				analysis,
				recommendedApp: analysis.recommendedApp.name,
				learningModules: analysis.learningModules,
				updatedAt: new Date(),
			})
			.where(eq(discoverySessions.id, sessionId))

		return NextResponse.json({ success: true, analysis, sessionId })
	} catch (err) {
		console.error('Analysis failed:', err instanceof Error ? err.message : 'Unknown error')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Analysis failed. Please try again.' } },
			{ status: 500 },
		)
	}
}
