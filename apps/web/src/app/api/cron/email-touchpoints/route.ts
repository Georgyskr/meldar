import { getDb } from '@meldar/db/client'
import { builds, users } from '@meldar/db/schema'
import { and, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { sendNudgeEmail } from '@/server/email'
import { verifyCronAuth } from '@/server/lib/cron-auth'

const MAX_EMAILS_PER_BATCH = 50

export async function GET(request: Request) {
	if (!verifyCronAuth(request)) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const db = getDb()
	const now = new Date()

	const oneDayAgoLow = new Date(now.getTime() - 26 * 60 * 60 * 1000)
	const oneDayAgoHigh = new Date(now.getTime() - 22 * 60 * 60 * 1000)

	const day1Users = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
		})
		.from(users)
		.where(
			and(
				gte(users.createdAt, oneDayAgoLow),
				lte(users.createdAt, oneDayAgoHigh),
				isNull(users.lastNudgeSentAt),
				sql`NOT EXISTS (
					SELECT 1 FROM ${builds}
					WHERE ${builds.projectId} IN (
						SELECT id FROM projects WHERE user_id = ${users.id}
					)
					AND ${builds.status} = 'completed'
				)`,
			),
		)
		.limit(MAX_EMAILS_PER_BATCH)

	const day1Results = await Promise.allSettled(
		day1Users.map((user) => sendNudgeEmail(user.email, user.name, 1)),
	)

	const day1SentIds = day1Users
		.filter((_, i) => day1Results[i].status === 'fulfilled')
		.map((u) => u.id)

	if (day1SentIds.length > 0) {
		await db.update(users).set({ lastNudgeSentAt: now }).where(inArray(users.id, day1SentIds))
	}

	for (let i = 0; i < day1Results.length; i++) {
		const r = day1Results[i]
		if (r.status === 'rejected') {
			console.error(
				`[email-touchpoints] Day 1 nudge failed for ${day1Users[i].id}:`,
				r.reason instanceof Error ? r.reason.message : 'Unknown',
			)
		}
	}

	const remainingBudget = MAX_EMAILS_PER_BATCH - day1SentIds.length
	const sevenDaysAgoLow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000)
	const sevenDaysAgoHigh = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
	const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

	const day7Users =
		remainingBudget > 0
			? await db
					.select({
						id: users.id,
						email: users.email,
						name: users.name,
					})
					.from(users)
					.where(
						and(
							gte(users.createdAt, sevenDaysAgoLow),
							lte(users.createdAt, sevenDaysAgoHigh),
							or(isNull(users.lastNudgeSentAt), lt(users.lastNudgeSentAt, threeDaysAgo)),
						),
					)
					.limit(remainingBudget)
			: []

	const day7Results = await Promise.allSettled(
		day7Users.map((user) => sendNudgeEmail(user.email, user.name, 7)),
	)

	const day7SentIds = day7Users
		.filter((_, i) => day7Results[i].status === 'fulfilled')
		.map((u) => u.id)

	if (day7SentIds.length > 0) {
		await db.update(users).set({ lastNudgeSentAt: now }).where(inArray(users.id, day7SentIds))
	}

	for (let i = 0; i < day7Results.length; i++) {
		const r = day7Results[i]
		if (r.status === 'rejected') {
			console.error(
				`[email-touchpoints] Day 7 nudge failed for ${day7Users[i].id}:`,
				r.reason instanceof Error ? r.reason.message : 'Unknown',
			)
		}
	}

	const day1Sent = day1SentIds.length
	const day7Sent = day7SentIds.length

	return Response.json({
		sent: { day1: day1Sent, day7: day7Sent },
		budget: { used: day1Sent + day7Sent, max: MAX_EMAILS_PER_BATCH },
	})
}
