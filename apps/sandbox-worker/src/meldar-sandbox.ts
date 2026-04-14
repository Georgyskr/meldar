import { Sandbox } from '@cloudflare/sandbox'

// Containers cost money for every second they run. The base SDK pins the
// container alive when `setKeepAlive(true)` is called (see ensureDevServer)
// and overrides `onActivityExpired` to a no-op in that mode — so without an
// explicit reaper, an HMAC-authed prewarm hands an attacker an unbounded
// per-project compute bill. This subclass adds a self-scheduled idle-TTL
// reaper: every successful handler op calls `touch()`, which records the
// activity timestamp and schedules `reapIfIdle` to run after the TTL.
export const IDLE_TTL_MS = 24 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = 'meldar:lastActivityAt'
const REAP_TASK_NAME = 'reapIfIdle'

// Re-scheduling on every request would write to DO storage on every request —
// expensive and pointless when the TTL is 24h. Only re-schedule if the
// existing alarm is more than RESCHEDULE_THRESHOLD_MS earlier than the new
// target. Effectively: at most one schedule-write per ~hour of activity.
const RESCHEDULE_THRESHOLD_MS = 60 * 60 * 1000

export class MeldarSandbox extends Sandbox {
	/**
	 * Mark the sandbox as active. Called by the worker after every successful
	 * handler operation. Records `now` to DO storage and ensures a reaper
	 * task is scheduled for `IDLE_TTL_MS` from now.
	 *
	 * Fire-and-forget from the caller's perspective — the worker uses
	 * ctx.waitUntil so latency is absorbed off the response path.
	 */
	async touch(): Promise<void> {
		const now = Date.now()
		await this.ctx.storage.put(LAST_ACTIVITY_KEY, now)

		const targetTime = new Date(now + IDLE_TTL_MS)
		const existing = await this.listSchedules(REAP_TASK_NAME).catch(() => [])
		// Schedule.time is a number (timestamp in ms) per @cloudflare/containers.
		const earliestExisting = existing
			.map((s) => s.time ?? Number.POSITIVE_INFINITY)
			.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY)

		if (
			earliestExisting === Number.POSITIVE_INFINITY ||
			targetTime.getTime() - earliestExisting > RESCHEDULE_THRESHOLD_MS
		) {
			// Drop stale schedules so we don't accumulate an unbounded queue
			// of reap tasks (each `schedule()` call adds a row).
			this.deleteSchedules(REAP_TASK_NAME)
			await this.schedule(targetTime, REAP_TASK_NAME)
		}
	}

	/**
	 * Reaper callback. Fired by Container's alarm() infrastructure when the
	 * scheduled task is due. Destroys the container only if the recorded
	 * activity is genuinely past the TTL — otherwise reschedules for the
	 * remaining delta. This is the safety net against races where a request
	 * arrives between schedule fire and callback execution.
	 */
	async reapIfIdle(): Promise<void> {
		const lastActivityAt = await this.ctx.storage.get<number>(LAST_ACTIVITY_KEY)
		const now = Date.now()

		if (typeof lastActivityAt !== 'number') {
			// No recorded activity — nothing to keep alive. Destroy and clear
			// state so a future request starts clean.
			await this.safeDestroy('no-activity')
			await this.ctx.storage.delete(LAST_ACTIVITY_KEY)
			return
		}

		const idleMs = now - lastActivityAt
		if (idleMs >= IDLE_TTL_MS) {
			await this.safeDestroy(`idle ${Math.round(idleMs / 1000)}s`)
			await this.ctx.storage.delete(LAST_ACTIVITY_KEY)
			return
		}

		// Activity refreshed inside the TTL window. Reschedule for the
		// remaining delta so the reaper tracks the most recent activity.
		const remainingMs = IDLE_TTL_MS - idleMs
		this.deleteSchedules(REAP_TASK_NAME)
		await this.schedule(new Date(now + remainingMs), REAP_TASK_NAME)
	}

	private async safeDestroy(reason: string): Promise<void> {
		try {
			await this.destroy()
			console.log(`[MeldarSandbox] reaped (${reason})`)
		} catch (err) {
			// destroy() can throw if the container is already gone; that's
			// the desired end state, so swallow but log so we notice noisy
			// failures (e.g. quota issues blocking destroy).
			console.warn(
				`[MeldarSandbox] destroy failed during reap (${reason}): ${
					err instanceof Error ? err.message : String(err)
				}`,
			)
		}
	}
}
