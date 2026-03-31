import { atomWithStorage, createJSONStorage } from 'jotai/utils'
import { type DiscoveryAnalysis, discoveryAnalysisSchema } from '@/server/discovery/parsers/types'

/** Persisted to localStorage so users can leave and come back */
export const sessionIdAtom = atomWithStorage<string | null>('meldar-session-id', null)

export const phaseAtom = atomWithStorage<'profile' | 'data' | 'adaptive' | 'results'>(
	'meldar-phase',
	'profile',
)

export const profileDataAtom = atomWithStorage<{
	occupation: string
	ageBracket: string
	painPicks: string[]
	aiComfort: number
	aiToolsUsed: string[]
} | null>('meldar-profile', null)

export const uploadStatusAtom = atomWithStorage<
	Record<
		string,
		{
			status: 'idle' | 'uploading' | 'processing' | 'done' | 'waiting' | 'error'
			errorMessage?: string
			uploadCount?: number
		}
	>
>('meldar-uploads', {})

/**
 * Validated storage: resets to null if localStorage data doesn't match
 * the DiscoveryAnalysis schema (e.g. stale or corrupted data).
 */
const validatedAnalysisStorage = createJSONStorage<DiscoveryAnalysis | null>(() => localStorage)
const originalGetItem = validatedAnalysisStorage.getItem
validatedAnalysisStorage.getItem = (key, initialValue) => {
	const raw = originalGetItem(key, initialValue)
	if (raw === null) return null
	const result = discoveryAnalysisSchema.safeParse(raw)
	return result.success ? result.data : null
}

export const analysisAtom = atomWithStorage<DiscoveryAnalysis | null>(
	'meldar-analysis',
	null,
	validatedAnalysisStorage,
)

export type AdaptiveFollowUpItem = {
	type: 'screenshot' | 'question'
	id: string
	appName?: string
	title: string
	description: string
	/** For question type: selectable options */
	options?: string[]
}

export const adaptiveFollowUpsAtom = atomWithStorage<AdaptiveFollowUpItem[]>(
	'meldar-adaptive-followups',
	[],
)

export const adaptiveAnswersAtom = atomWithStorage<Record<string, string>>(
	'meldar-adaptive-answers',
	{},
)
