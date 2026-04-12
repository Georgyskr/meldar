/**
 * Upstash Redis test mock factory. `UpstashTokenLedger` only ever calls
 * `redis.eval()` (atomic Lua debit) and `redis.get()` (snapshot reads), so
 * the mock only implements those two. The unsafe `as unknown as Redis` cast
 * is confined here.
 *
 * Handler types mirror `Redis['eval']` / `Redis['get']` but drop the SDK's
 * generics because a runtime `vi.fn(impl)` can't satisfy a generic function
 * position. `args` is narrowed to `(string|number)[]` — the only shape the
 * ledger ever passes and what real Lua ARGV accepts — so a typo at the call
 * site still fails compilation.
 */

import type { Redis } from '@upstash/redis'

export type RedisMockHandlers = {
	eval?: (script: string, keys: string[], args: (string | number)[]) => Promise<unknown>
	get?: (key: string) => Promise<unknown>
}

/**
 * Build a minimal Upstash `Redis` instance whose only implemented methods are
 * the ones supplied in `handlers`. Calling any other method at runtime would
 * throw — the type cast does NOT add stub implementations.
 */
export function makeRedisMock(handlers: RedisMockHandlers): Redis {
	return handlers as unknown as Redis
}
