import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// MeldarSandbox extends @cloudflare/sandbox's Sandbox, which transitively
// imports @cloudflare/containers — that package's ESM entry can't resolve in
// a plain node:vitest run. We don't need the real implementation; replacing
// the base class with a stub lets us exercise the methods we actually wrote
// without dragging in the full Workers runtime.
vi.mock('@cloudflare/sandbox', () => {
	// Implicit constructor accepts any args at runtime; the harness throws
	// dummy values at it just to satisfy the TS signature inherited from the
	// real declaration files. State (ctx, schedule, etc.) is assigned later.
	class Sandbox {}
	return { Sandbox }
})

import { IDLE_TTL_MS, MeldarSandbox } from '../meldar-sandbox'

type StoredSchedule = { taskId: string; callback: string; time: number; type: 'scheduled' }

// Build a MeldarSandbox instance with its DO/Container surface area replaced
// by in-memory fakes. The subclass methods (`touch`, `reapIfIdle`) run
// untouched against these — that's the whole point of the test.
function buildHarness() {
	const storage = new Map<string, unknown>()
	const schedules: StoredSchedule[] = []
	let destroyCount = 0
	let destroyShouldThrow = false

	// Real Sandbox(ctx, env) signature; both ignored by the vi.mock stub above.
	const sandbox = new MeldarSandbox({} as never, {} as never)

	Object.assign(sandbox, {
		ctx: {
			storage: {
				put: vi.fn(async (k: string, v: unknown) => {
					storage.set(k, v)
				}),
				get: vi.fn(async (k: string) => storage.get(k)),
				delete: vi.fn(async (k: string) => {
					storage.delete(k)
				}),
			},
		},
		listSchedules: vi.fn(async (name: string): Promise<StoredSchedule[]> => {
			return schedules.filter((s) => s.callback === name)
		}),
		schedule: vi.fn(async (when: Date, callback: string): Promise<StoredSchedule> => {
			const entry: StoredSchedule = {
				taskId: `${schedules.length + 1}`,
				callback,
				time: when.getTime(),
				type: 'scheduled',
			}
			schedules.push(entry)
			return entry
		}),
		deleteSchedules: vi.fn((name: string): void => {
			for (let i = schedules.length - 1; i >= 0; i--) {
				if (schedules[i].callback === name) schedules.splice(i, 1)
			}
		}),
		destroy: vi.fn(async (): Promise<void> => {
			if (destroyShouldThrow) throw new Error('destroy already in progress')
			destroyCount++
		}),
	})

	return {
		sandbox,
		storage,
		schedules,
		setDestroyShouldThrow(v: boolean) {
			destroyShouldThrow = v
		},
		getDestroyCount() {
			return destroyCount
		},
	}
}

describe('MeldarSandbox reaper', () => {
	let now: number
	let h: ReturnType<typeof buildHarness>

	beforeEach(() => {
		now = 1_700_000_000_000
		vi.spyOn(Date, 'now').mockImplementation(() => now)
		h = buildHarness()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('touch()', () => {
		it('writes lastActivityAt to DO storage', async () => {
			await h.sandbox.touch()
			expect(h.storage.get('meldar:lastActivityAt')).toBe(now)
		})

		it('schedules reapIfIdle for now + IDLE_TTL_MS on first call', async () => {
			await h.sandbox.touch()
			expect(h.schedules).toHaveLength(1)
			expect(h.schedules[0].callback).toBe('reapIfIdle')
			expect(h.schedules[0].time).toBe(now + IDLE_TTL_MS)
		})

		it('does NOT reschedule on a touch immediately after another (debounce)', async () => {
			await h.sandbox.touch()
			now += 60 * 1000 // 60s later — well under RESCHEDULE_THRESHOLD_MS (1h)
			await h.sandbox.touch()
			// Both touches update storage timestamp...
			expect(h.storage.get('meldar:lastActivityAt')).toBe(now)
			// ...but only one schedule write — saves SQLite cost on hot paths.
			expect(h.schedules).toHaveLength(1)
		})

		it('reschedules when next touch is more than RESCHEDULE_THRESHOLD beyond existing alarm', async () => {
			await h.sandbox.touch()
			now += 2 * 60 * 60 * 1000 // 2h later — above 1h threshold
			await h.sandbox.touch()
			// Old schedule replaced; only one alarm in the queue.
			expect(h.schedules).toHaveLength(1)
			expect(h.schedules[0].time).toBe(now + IDLE_TTL_MS)
		})

		it('survives listSchedules failure by treating it as no existing schedule', async () => {
			;(h.sandbox.listSchedules as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error('storage transient'),
			)
			await h.sandbox.touch()
			// Falls through to the no-existing-schedule branch and writes one.
			expect(h.schedules).toHaveLength(1)
		})
	})

	describe('reapIfIdle()', () => {
		it('destroys the container when idle ≥ IDLE_TTL_MS', async () => {
			await h.sandbox.touch() // sets lastActivityAt = now
			now += IDLE_TTL_MS + 1000 // advance past TTL
			await h.sandbox.reapIfIdle()
			expect(h.getDestroyCount()).toBe(1)
			// Storage cleared so a future request starts clean.
			expect(h.storage.has('meldar:lastActivityAt')).toBe(false)
		})

		it('does NOT destroy when activity is fresh; reschedules for the remaining delta', async () => {
			await h.sandbox.touch()
			now += IDLE_TTL_MS - 60 * 60 * 1000 // 23h elapsed, 1h remaining
			await h.sandbox.reapIfIdle()
			expect(h.getDestroyCount()).toBe(0)
			// Old schedule replaced with a fresh one targeting now+1h.
			expect(h.schedules).toHaveLength(1)
			expect(h.schedules[0].time).toBe(now + 60 * 60 * 1000)
		})

		it('destroys when no lastActivityAt is recorded (missing state)', async () => {
			// e.g. DO storage was wiped or this is a stray scheduled fire.
			await h.sandbox.reapIfIdle()
			expect(h.getDestroyCount()).toBe(1)
		})

		it('swallows destroy errors so the alarm callback never throws', async () => {
			await h.sandbox.touch()
			now += IDLE_TTL_MS + 1000
			h.setDestroyShouldThrow(true)
			await expect(h.sandbox.reapIfIdle()).resolves.toBeUndefined()
		})

		it('clears lastActivityAt even if destroy throws, so the next request rebuilds state', async () => {
			await h.sandbox.touch()
			now += IDLE_TTL_MS + 1000
			h.setDestroyShouldThrow(true)
			await h.sandbox.reapIfIdle()
			expect(h.storage.has('meldar:lastActivityAt')).toBe(false)
		})
	})

	describe('cost-DoS guarantee (the security property)', () => {
		it('a single prewarm followed by 24h+ silence terminates the container exactly once', async () => {
			await h.sandbox.touch()
			now += IDLE_TTL_MS // alarm fires at scheduled time
			await h.sandbox.reapIfIdle()
			expect(h.getDestroyCount()).toBe(1)
		})

		it('continuous activity (touch every hour) prevents reaping', async () => {
			for (let i = 0; i < 48; i++) {
				await h.sandbox.touch()
				now += 60 * 60 * 1000
			}
			// Fire whatever alarm is currently scheduled. Activity within the
			// last hour — well under TTL — so destroy must not run.
			await h.sandbox.reapIfIdle()
			expect(h.getDestroyCount()).toBe(0)
		})
	})
})
