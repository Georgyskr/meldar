/**
 * F9: Compile-time assertion that the SDK exposes the methods MeldarSandbox
 * relies on for cost-safety (the reaper). If @cloudflare/sandbox or its
 * Container parent class ever renames or removes one of these, this file
 * stops typechecking loudly — much better than the reaper silently losing
 * its ability to schedule destroys and running up a compute bill.
 *
 * This is a .test-d.ts file: no runtime assertions, no vitest registrations.
 * tsc --noEmit is the actual checker; its presence in `src/__tests__/` means
 * `pnpm --filter @meldar/sandbox-worker exec tsc --noEmit` covers it.
 */

import type { Sandbox } from '@cloudflare/sandbox'

// The public Sandbox methods MeldarSandbox depends on. `ctx.storage` is
// reached through the `protected ctx` parent field inside the subclass, so
// it's not on the public surface and can't be Pick'd here — the four method
// names below are the ones at risk if the SDK renames.
type SandboxPublicMethodsWeUse = Pick<
	Sandbox,
	'schedule' | 'listSchedules' | 'deleteSchedules' | 'destroy'
>

// Conditional-type assertion. If any property in SandboxPublicMethodsWeUse
// is missing from Sandbox, Pick<> errors on the constraint check. `true` is
// the sentinel — a `never` assignment fails TS2322.
type AllPresent = SandboxPublicMethodsWeUse extends Record<string, unknown> ? true : never
const _allPresent: AllPresent = true
void _allPresent

// Narrow signature checks — if the SDK changes parameter shape, these fail.
type ScheduleSig = (when: Date | number, callback: string, payload?: unknown) => Promise<unknown>
type ListSchedulesSig = (name: string) => Promise<unknown>
type DestroySig = () => Promise<unknown>

const _schedule: (s: Sandbox) => ScheduleSig = (s) => s.schedule.bind(s)
const _list: (s: Sandbox) => ListSchedulesSig = (s) => s.listSchedules.bind(s)
const _destroy: (s: Sandbox) => DestroySig = (s) => s.destroy.bind(s)
void _schedule
void _list
void _destroy
