import { getDb } from '@meldar/db/client'
import { discoverySessions } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import {
	type AdaptiveDataEntry,
	type AnalysisInput,
	type BatteryData,
	type CalendarData,
	type HealthData,
	runCrossAnalysis,
	type StorageData,
	type SubscriptionsData,
} from '@/server/discovery/analyze'
import type { AiChatPattern, GooglePattern } from '@/server/discovery/parsers/types'
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

		// First check if analysis already exists with a lightweight query
		const [cacheCheck] = await db
			.select({
				id: discoverySessions.id,
				analysis: discoverySessions.analysis,
			})
			.from(discoverySessions)
			.where(eq(discoverySessions.id, sessionId))
			.limit(1)

		if (!cacheCheck) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: 'Session not found.' } },
				{ status: 404 },
			)
		}

		// Don't re-run analysis if already done
		if (cacheCheck.analysis) {
			return NextResponse.json({
				success: true,
				analysis: cacheCheck.analysis,
				sessionId,
			})
		}

		// Only fetch full session data when analysis is needed
		const [session] = await db
			.select({
				quizPicks: discoverySessions.quizPicks,
				aiComfort: discoverySessions.aiComfort,
				aiToolsUsed: discoverySessions.aiToolsUsed,
				screenTimeData: discoverySessions.screenTimeData,
				chatgptData: discoverySessions.chatgptData,
				claudeData: discoverySessions.claudeData,
				googleData: discoverySessions.googleData,
				subscriptionsData: discoverySessions.subscriptionsData,
				batteryData: discoverySessions.batteryData,
				storageData: discoverySessions.storageData,
				calendarData: discoverySessions.calendarData,
				healthData: discoverySessions.healthData,
				adaptiveData: discoverySessions.adaptiveData,
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

		const input: AnalysisInput = {
			quizPicks: session.quizPicks ?? [],
			aiComfort: session.aiComfort ?? 1,
			aiToolsUsed: session.aiToolsUsed ?? [],
			screenTime: session.screenTimeData as ScreenTimeExtraction | undefined,
			chatgptData: session.chatgptData as AiChatPattern | undefined,
			claudeData: session.claudeData as AiChatPattern | undefined,
			googleData: session.googleData as GooglePattern | undefined,
			subscriptionsData: session.subscriptionsData as SubscriptionsData | undefined,
			batteryData: session.batteryData as BatteryData | undefined,
			storageData: session.storageData as StorageData | undefined,
			calendarData: session.calendarData as CalendarData | undefined,
			healthData: session.healthData as HealthData | undefined,
			adaptiveData: session.adaptiveData as AdaptiveDataEntry[] | undefined,
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
