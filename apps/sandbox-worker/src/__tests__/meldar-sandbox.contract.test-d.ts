/** Compile-time check that the Sandbox SDK still exposes the public methods
 *  MeldarSandbox depends on. If any gets renamed, tsc fails on this file
 *  rather than the reaper silently losing its ability to destroy idle DOs. */

import type { Sandbox } from '@cloudflare/sandbox'

type SandboxPublicMethodsWeUse = Pick<
	Sandbox,
	'schedule' | 'listSchedules' | 'deleteSchedules' | 'destroy'
>

type AllPresent = SandboxPublicMethodsWeUse extends Record<string, unknown> ? true : never
const _allPresent: AllPresent = true
void _allPresent

type ScheduleSig = (when: Date | number, callback: string, payload?: unknown) => Promise<unknown>
type ListSchedulesSig = (name: string) => Promise<unknown>
type DestroySig = () => Promise<unknown>

const _schedule: (s: Sandbox) => ScheduleSig = (s) => s.schedule.bind(s)
const _list: (s: Sandbox) => ListSchedulesSig = (s) => s.listSchedules.bind(s)
const _destroy: (s: Sandbox) => DestroySig = (s) => s.destroy.bind(s)
void _schedule
void _list
void _destroy
