import { getDb } from '@meldar/db/client'
import { aiCallLog } from '@meldar/db/schema'
import { Redis } from '@upstash/redis'
import { and, desc, gte, sql } from 'drizzle-orm'
import { sendFounderAlertEmail } from '@/server/email'

function getRedis(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

const redis = getRedis()

async function tryAcquireAlertLock(level: 'warning' | 'panic', yyyymmdd: string): Promise<boolean> {
	if (!redis) return true
	// Warning: one per day. Panic: one per 15 minutes.
	const ttlSeconds = level === 'panic' ? 15 * 60 : 12 * 60 * 60
	const keyScope =
		level === 'panic' ? `${yyyymmdd}-${Math.floor(Date.now() / (15 * 60 * 1000))}` : yyyymmdd
	const key = `meldar:alert-sent:${level}:${keyScope}`
	const acquired = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
	return acquired === 'OK'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WARNING_THRESHOLD_CENTS = 2000
const PANIC_THRESHOLD_CENTS = 5000

function formatCents(cents: number): string {
	return `€${(cents / 100).toFixed(2)}`
}

export async function GET(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const db = getDb()

	const startOfDay = new Date()
	startOfDay.setUTCHours(0, 0, 0, 0)

	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

	const [todayTotal] = await db
		.select({
			total: sql<number>`COALESCE(SUM(${aiCallLog.centsCharged}), 0)::int`,
			count: sql<number>`COUNT(*)::int`,
		})
		.from(aiCallLog)
		.where(gte(aiCallLog.createdAt, startOfDay))

	const [hourTotal] = await db
		.select({
			total: sql<number>`COALESCE(SUM(${aiCallLog.centsCharged}), 0)::int`,
			count: sql<number>`COUNT(*)::int`,
		})
		.from(aiCallLog)
		.where(gte(aiCallLog.createdAt, oneHourAgo))

	const todaySpent = todayTotal?.total ?? 0
	const hourSpent = hourTotal?.total ?? 0

	let level: 'warning' | 'panic' | null = null
	if (hourSpent >= PANIC_THRESHOLD_CENTS) {
		level = 'panic'
	} else if (todaySpent >= WARNING_THRESHOLD_CENTS) {
		level = 'warning'
	}

	const result = {
		todaySpent,
		todayCalls: todayTotal?.count ?? 0,
		hourSpent,
		hourCalls: hourTotal?.count ?? 0,
		alertLevel: level,
	}

	if (!level) {
		return Response.json(result)
	}

	const yyyymmdd = startOfDay.toISOString().slice(0, 10)
	const acquired = await tryAcquireAlertLock(level, yyyymmdd)
	if (!acquired) {
		return Response.json({ ...result, skipped: 'dedup' })
	}

	const topSpenders = await db
		.select({
			userId: aiCallLog.userId,
			kind: aiCallLog.kind,
			total: sql<number>`SUM(${aiCallLog.centsCharged})::int`,
			calls: sql<number>`COUNT(*)::int`,
		})
		.from(aiCallLog)
		.where(and(gte(aiCallLog.createdAt, startOfDay)))
		.groupBy(aiCallLog.userId, aiCallLog.kind)
		.orderBy(desc(sql`SUM(${aiCallLog.centsCharged})`))
		.limit(10)

	const spendersHtml = topSpenders
		.map(
			(s) =>
				`<li><code>${s.userId?.slice(0, 8) ?? 'anon'}</code> · ${s.kind} · ${formatCents(s.total)} · ${s.calls} calls</li>`,
		)
		.join('')

	const bodyHtml = `
		<p style="font-size: 14px; color: #4f434a;">
			<strong>Today so far:</strong> ${formatCents(todaySpent)} across ${result.todayCalls} calls<br/>
			<strong>Last hour:</strong> ${formatCents(hourSpent)} across ${result.hourCalls} calls
		</p>
		<p style="font-size: 14px; color: #4f434a;">
			<strong>Thresholds:</strong><br/>
			Warning (today total) ≥ ${formatCents(WARNING_THRESHOLD_CENTS)}<br/>
			Panic (last hour) ≥ ${formatCents(PANIC_THRESHOLD_CENTS)}
		</p>
		<h2 style="font-size: 16px; color: #623153; margin-top: 24px;">Top spenders today</h2>
		<ul style="font-size: 13px; color: #4f434a;">
			${spendersHtml || '<li>No calls yet today.</li>'}
		</ul>
	`

	try {
		await sendFounderAlertEmail({
			level,
			subjectDetail:
				level === 'panic'
					? `${formatCents(hourSpent)} in 1 hour`
					: `${formatCents(todaySpent)} spent today`,
			bodyHtml,
		})
	} catch (err) {
		console.error('[cron/spend-alert] sendFounderAlertEmail failed', err)
		return Response.json(
			{ ...result, emailError: err instanceof Error ? err.message : 'unknown' },
			{ status: 500 },
		)
	}

	return Response.json({ ...result, emailSent: true })
}
