import type { ResolvedWishes } from './prompts'

type RawWishes = {
	readonly proposal?: ResolvedWishes
	readonly overrides?: Record<string, string>
} | null

export function resolveWishes(raw: RawWishes | undefined): ResolvedWishes | undefined {
	if (!raw?.proposal) return undefined
	return { ...raw.proposal, ...(raw.overrides ?? {}) }
}
