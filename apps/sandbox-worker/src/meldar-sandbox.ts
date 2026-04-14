import { Sandbox } from '@cloudflare/sandbox'

// Idle-TTL reaper bounds the compute bill when setKeepAlive(true) is in effect.
// The SDK's own onActivityExpired is a no-op in keep-alive mode; without this
// reaper, an HMAC-authed prewarm pins a container indefinitely.
export const IDLE_TTL_MS = 24 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = 'meldar:lastActivityAt'
const REAP_TASK_NAME = 'reapIfIdle'
// At most one DO-storage schedule write per hour of activity.
const RESCHEDULE_THRESHOLD_MS = 60 * 60 * 1000

export class MeldarSandbox extends Sandbox {
	async touch(): Promise<void> {
		const now = Date.now()
		await this.ctx.storage.put(LAST_ACTIVITY_KEY, now)

		const targetTime = new Date(now + IDLE_TTL_MS)
		const existing = await this.listSchedules(REAP_TASK_NAME).catch(() => [])
		const earliestExisting = existing
			.map((s) => s.time ?? Number.POSITIVE_INFINITY)
			.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY)

		if (
			earliestExisting === Number.POSITIVE_INFINITY ||
			targetTime.getTime() - earliestExisting > RESCHEDULE_THRESHOLD_MS
		) {
			this.deleteSchedules(REAP_TASK_NAME)
			await this.schedule(targetTime, REAP_TASK_NAME)
		}
	}

	async reapIfIdle(): Promise<void> {
		const lastActivityAt = await this.ctx.storage.get<number>(LAST_ACTIVITY_KEY)
		const now = Date.now()

		if (typeof lastActivityAt !== 'number') {
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

		// Activity refreshed inside the TTL: reschedule for the remaining delta.
		const remainingMs = IDLE_TTL_MS - idleMs
		this.deleteSchedules(REAP_TASK_NAME)
		await this.schedule(new Date(now + remainingMs), REAP_TASK_NAME)
	}

	private async safeDestroy(reason: string): Promise<void> {
		try {
			await this.destroy()
			console.log(`[MeldarSandbox] reaped (${reason})`)
		} catch (err) {
			// destroy() on an already-gone container is fine — log so we'd still
			// catch the less-benign cases (quota blocking destroy, etc.).
			console.warn(
				`[MeldarSandbox] destroy failed during reap (${reason}): ${
					err instanceof Error ? err.message : String(err)
				}`,
			)
		}
	}
}
