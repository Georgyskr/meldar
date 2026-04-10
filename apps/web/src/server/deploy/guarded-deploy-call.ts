import { isValidSlug } from '@meldar/orchestrator'
import { Redis } from '@upstash/redis'
import { recordDeployment } from './deployment-log'
import { type DeployInput, type DeployResult, deployToVercel } from './vercel-deploy'

const DEFAULT_USER_HOURLY_CAP = 3
const DEFAULT_USER_DAILY_CAP = 10
const DEFAULT_GLOBAL_DAILY_CAP = 200

function getRedis(): Redis | null {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return null
	}
	return new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN,
	})
}

const redis = getRedis()

const KILL_SWITCH_KEY = 'meldar:deploy:kill-switch'

function todayKey(): string {
	const now = new Date()
	const y = now.getUTCFullYear()
	const m = String(now.getUTCMonth() + 1).padStart(2, '0')
	const d = String(now.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

function hourKey(): string {
	const h = String(new Date().getUTCHours()).padStart(2, '0')
	return `${todayKey()}-${h}`
}

function userDeployDailyKey(userId: string): string {
	return `meldar:deploy:u:${userId}:d:${todayKey()}`
}

function userDeployHourlyKey(userId: string): string {
	return `meldar:deploy:u:${userId}:h:${hourKey()}`
}

function globalDeployDailyKey(): string {
	return `meldar:deploy:g:d:${todayKey()}`
}

function envCap(envVar: string, fallback: number): number {
	const env = process.env[envVar]
	if (!env) return fallback
	const parsed = Number.parseInt(env, 10)
	return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed
}

export type DeployRejectionReason =
	| 'kill_switch'
	| 'redis_unavailable'
	| 'invalid_slug'
	| 'user_hourly_cap'
	| 'user_daily_cap'
	| 'global_daily_cap'
	| 'not_configured'

export type GuardedDeployResult =
	| { readonly ok: true; readonly deploy: Extract<DeployResult, { ok: true }> }
	| {
			readonly ok: false
			readonly rejected: true
			readonly reason: DeployRejectionReason
			readonly message: string
	  }
	| {
			readonly ok: false
			readonly rejected: false
			readonly deploy: Extract<DeployResult, { ok: false }>
	  }

export type GuardedDeployArgs = {
	readonly userId: string
	readonly projectId: string
	readonly buildId?: string
	readonly slug: string
	readonly files: DeployInput['files']
	readonly signal?: AbortSignal
	readonly fetchImpl?: DeployInput['fetchImpl']
}

async function isKillSwitchOpen(): Promise<boolean> {
	if (!redis) return true
	try {
		const val = await redis.get<string | number | null>(KILL_SWITCH_KEY)
		return val === '1' || val === 1 || val === 'true'
	} catch (err) {
		console.error(
			'[guarded-deploy] kill switch read failed, failing closed',
			err instanceof Error ? err.message : 'Unknown',
		)
		return true
	}
}

async function reserveAllCeilings(userId: string): Promise<DeployRejectionReason | null> {
	if (!redis) return 'redis_unavailable'

	const userHourlyLimit = envCap('DEPLOY_USER_HOURLY_CAP', DEFAULT_USER_HOURLY_CAP)
	const userDailyLimit = envCap('DEPLOY_USER_DAILY_CAP', DEFAULT_USER_DAILY_CAP)
	const globalDailyLimit = envCap('DEPLOY_GLOBAL_DAILY_CAP', DEFAULT_GLOBAL_DAILY_CAP)

	const hourlyKey = userDeployHourlyKey(userId)
	const dailyKey = userDeployDailyKey(userId)
	const globalKey = globalDeployDailyKey()

	try {
		const [hourly, daily, global] = await Promise.all([
			redis.get<number>(hourlyKey).then((v) => v ?? 0),
			redis.get<number>(dailyKey).then((v) => v ?? 0),
			redis.get<number>(globalKey).then((v) => v ?? 0),
		])

		if (hourly >= userHourlyLimit) return 'user_hourly_cap'
		if (daily >= userDailyLimit) return 'user_daily_cap'
		if (global >= globalDailyLimit) return 'global_daily_cap'

		await Promise.all([redis.incr(hourlyKey), redis.incr(dailyKey), redis.incr(globalKey)])

		await Promise.all([
			redis.expire(hourlyKey, 60 * 60 + 60),
			redis.expire(dailyKey, 24 * 60 * 60 + 60),
			redis.expire(globalKey, 24 * 60 * 60 + 60),
		])

		return null
	} catch (err) {
		console.error(
			'[guarded-deploy] ceiling check failed, failing closed',
			err instanceof Error ? err.message : 'Unknown',
		)
		return 'redis_unavailable'
	}
}

export async function guardedDeployCall(args: GuardedDeployArgs): Promise<GuardedDeployResult> {
	if (await isKillSwitchOpen()) {
		recordDeployment({
			userId: args.userId,
			projectId: args.projectId,
			buildId: args.buildId,
			slug: args.slug,
			status: 'quota_exceeded',
			errorCode: 'kill_switch',
			errorMessage: 'Deploy pipeline paused by kill switch',
			apiLatencyMs: 0,
		})
		return {
			ok: false,
			rejected: true,
			reason: 'kill_switch',
			message: 'Deploy pipeline is temporarily paused. Try again soon.',
		}
	}

	if (!isValidSlug(args.slug)) {
		recordDeployment({
			userId: args.userId,
			projectId: args.projectId,
			buildId: args.buildId,
			slug: args.slug,
			status: 'error',
			errorCode: 'invalid_slug',
			errorMessage: `Slug "${args.slug}" failed validation`,
			apiLatencyMs: 0,
		})
		return {
			ok: false,
			rejected: true,
			reason: 'invalid_slug',
			message: "That URL isn't allowed. Try a different one.",
		}
	}

	const rejection = await reserveAllCeilings(args.userId)
	if (rejection) {
		recordDeployment({
			userId: args.userId,
			projectId: args.projectId,
			buildId: args.buildId,
			slug: args.slug,
			status: 'quota_exceeded',
			errorCode: rejection,
			errorMessage: `Blocked by ${rejection}`,
			apiLatencyMs: 0,
		})
		return {
			ok: false,
			rejected: true,
			reason: rejection,
			message: rejectionMessage(rejection),
		}
	}

	recordDeployment({
		userId: args.userId,
		projectId: args.projectId,
		buildId: args.buildId,
		slug: args.slug,
		status: 'building',
		apiLatencyMs: 0,
	})

	const result = await deployToVercel({
		slug: args.slug,
		files: args.files,
		signal: args.signal,
		fetchImpl: args.fetchImpl,
	})

	if (!result.ok) {
		recordDeployment({
			userId: args.userId,
			projectId: args.projectId,
			buildId: args.buildId,
			slug: args.slug,
			vercelProjectId: result.vercelProjectId,
			vercelDeploymentId: result.vercelDeploymentId,
			status: result.error.kind === 'deployment_timeout' ? 'timeout' : 'error',
			errorCode: result.error.kind,
			errorMessage: formatDeployError(result.error),
			apiLatencyMs: result.apiLatencyMs,
			completedAt: new Date(),
		})
		if (result.error.kind === 'not_configured') {
			return {
				ok: false,
				rejected: true,
				reason: 'not_configured',
				message: 'Deploy is not configured yet. The team has been notified.',
			}
		}
		return { ok: false, rejected: false, deploy: result }
	}

	recordDeployment({
		userId: args.userId,
		projectId: args.projectId,
		buildId: args.buildId,
		slug: args.slug,
		vercelProjectId: result.vercelProjectId,
		vercelDeploymentId: result.vercelDeploymentId,
		url: result.url,
		status: 'ready',
		apiLatencyMs: result.apiLatencyMs,
		buildDurationMs: result.buildDurationMs,
		completedAt: new Date(),
	})

	return { ok: true, deploy: result }
}

function rejectionMessage(reason: DeployRejectionReason): string {
	switch (reason) {
		case 'kill_switch':
			return 'Deploy pipeline is temporarily paused. Try again soon.'
		case 'redis_unavailable':
			return "We're having trouble checking quotas. Try again in a minute."
		case 'invalid_slug':
			return "That URL isn't allowed. Try a different one."
		case 'user_hourly_cap':
			return "You've hit your hourly deploy limit. Come back in an hour."
		case 'user_daily_cap':
			return "You've hit your daily deploy limit. Come back tomorrow."
		case 'global_daily_cap':
			return 'Meldar is busy right now. Come back in a bit.'
		case 'not_configured':
			return 'Deploy is not configured yet. The team has been notified.'
	}
}

function formatDeployError(err: Extract<DeployResult, { ok: false }>['error']): string {
	switch (err.kind) {
		case 'not_configured':
			return `Missing env: ${err.missing.join(', ')}`
		case 'project_create_failed':
			return `Project create ${err.status}: ${err.body.slice(0, 200)}`
		case 'upload_failed':
			return `Upload failed for ${err.path} (status ${err.status})`
		case 'deployment_create_failed':
			return `Deployment create ${err.status}: ${err.body.slice(0, 200)}`
		case 'deployment_build_failed':
			return `Build failed (last state: ${err.lastState})`
		case 'deployment_timeout':
			return `Build timed out (last state: ${err.lastState})`
		case 'domain_add_failed':
			return `Domain add ${err.status}: ${err.body.slice(0, 200)}`
		case 'alias_failed':
			return `Alias failed ${err.status}: ${err.body.slice(0, 200)}`
		case 'network_error':
			return `Network: ${err.message}`
	}
}
