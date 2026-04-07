// @vitest-environment jsdom

import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiscoveryAnalysis } from '@/shared/types/discovery'
import type { AdaptiveFollowUpItem } from '../atoms'

// ── Helpers ─────────────────────────────────────────────────────────────────

const validAnalysis: DiscoveryAnalysis = {
	recommendedApp: {
		name: 'Meal Planner',
		description: 'Plans meals for the week',
		whyThisUser: 'You spend 3h/week deciding what to eat',
		complexity: 'beginner',
		estimatedBuildTime: '2 days',
	},
	additionalApps: [
		{
			name: 'Price Watcher',
			description: 'Tracks price drops',
			whyThisUser: 'You search for deals frequently',
		},
	],
	learningModules: [
		{
			id: 'mod-1',
			title: 'Getting Started',
			description: 'Learn the basics',
			locked: false,
		},
	],
	keyInsights: [
		{
			headline: 'Social media dominates',
			detail: 'Instagram + TikTok = 4h/day',
			source: 'screentime',
		},
	],
	dataProfile: {
		totalSourcesAnalyzed: 3,
		topProblemAreas: ['social media', 'meal planning'],
		aiUsageLevel: 'moderate',
	},
}

/** Re-import atoms module after resetModules so atoms re-read localStorage */
async function freshAtoms() {
	vi.resetModules()
	return await import('../atoms')
}

/**
 * atomWithStorage hydrates asynchronously. After store.sub(), the callback fires
 * to deliver the hydrated value. This helper handles that safely.
 */
function waitForHydration<T>(
	store: ReturnType<typeof createStore>,
	atom: Parameters<ReturnType<typeof createStore>['sub']>[0],
): Promise<T> {
	return new Promise((resolve) => {
		let unsubFn: (() => void) | null = null
		let resolved = false

		unsubFn = store.sub(atom, () => {
			if (!resolved) {
				resolved = true
				const val = store.get(atom) as T
				// Defer unsub to avoid referencing before assignment
				queueMicrotask(() => unsubFn?.())
				resolve(val)
			}
		})

		// If the callback fired synchronously during sub(), resolved is already true
		if (resolved) return

		// Trigger a read to kick off hydration
		store.get(atom)
	})
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('atoms', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ── sessionIdAtom ───────────────────────────────────────────────────────

	describe('sessionIdAtom', () => {
		it('initializes to null when localStorage key "meldar-session-id" is absent', async () => {
			const { sessionIdAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(sessionIdAtom)).toBeNull()
		})

		it('persists a set value to localStorage', async () => {
			const { sessionIdAtom } = await freshAtoms()
			const store = createStore()
			store.set(sessionIdAtom, 'abc-123')
			await vi.waitFor(() => {
				expect(JSON.parse(localStorage.getItem('meldar-session-id') as string)).toBe('abc-123')
			})
		})

		it('restores value from localStorage on a fresh atom read', async () => {
			localStorage.setItem('meldar-session-id', JSON.stringify('restored-id'))
			const { sessionIdAtom } = await freshAtoms()
			const store = createStore()
			const value = await waitForHydration<string | null>(store, sessionIdAtom)
			expect(value).toBe('restored-id')
		})
	})

	// ── phaseAtom ───────────────────────────────────────────────────────────

	describe('phaseAtom', () => {
		it('initializes to "profile"', async () => {
			const { phaseAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(phaseAtom)).toBe('profile')
		})

		it('persists each valid phase value: profile, data, adaptive, results', async () => {
			// Skip 'profile' in the loop — it's the default and already tested above.
			// Setting an atom to its current default won't trigger a storage write.
			const nonDefaultPhases = ['data', 'adaptive', 'results'] as const
			for (const phase of nonDefaultPhases) {
				localStorage.clear()

				const { phaseAtom } = await freshAtoms()
				const store = createStore()
				store.set(phaseAtom, phase)

				await vi.waitFor(() => {
					expect(JSON.parse(localStorage.getItem('meldar-phase') as string)).toBe(phase)
				})

				// Read back with a fresh module re-import
				const atoms2 = await freshAtoms()
				const store2 = createStore()
				const value = await waitForHydration<string>(store2, atoms2.phaseAtom)
				expect(value).toBe(phase)
			}

			// Also verify 'profile' persists when set explicitly after another value
			localStorage.clear()
			const { phaseAtom } = await freshAtoms()
			const store = createStore()
			store.set(phaseAtom, 'data')
			store.set(phaseAtom, 'profile')
			await vi.waitFor(() => {
				expect(JSON.parse(localStorage.getItem('meldar-phase') as string)).toBe('profile')
			})
		})
	})

	// ── profileDataAtom ─────────────────────────────────────────────────────

	describe('profileDataAtom', () => {
		it('initializes to null', async () => {
			const { profileDataAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(profileDataAtom)).toBeNull()
		})

		it('persists full profile object', async () => {
			const profile = {
				occupation: 'student',
				ageBracket: '18-24',
				painPicks: ['social_media', 'meal_planning'],
				aiComfort: 3,
				aiToolsUsed: ['chatgpt'],
			}

			const { profileDataAtom } = await freshAtoms()
			const store = createStore()
			store.set(profileDataAtom, profile)

			const atoms2 = await freshAtoms()
			const store2 = createStore()
			const value = await waitForHydration<typeof profile | null>(store2, atoms2.profileDataAtom)
			expect(value).toEqual(profile)
		})
	})

	// ── uploadStatusAtom ────────────────────────────────────────────────────

	describe('uploadStatusAtom', () => {
		it('initializes to {}', async () => {
			const { uploadStatusAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(uploadStatusAtom)).toEqual({})
		})

		it('persists status per platform key', async () => {
			const { uploadStatusAtom } = await freshAtoms()
			const store = createStore()
			store.set(uploadStatusAtom, {
				screentime: { status: 'done', uploadCount: 3 },
				chatgpt: { status: 'uploading' },
			})

			const atoms2 = await freshAtoms()
			const store2 = createStore()
			const restored = await waitForHydration<
				Record<string, { status: string; uploadCount?: number }>
			>(store2, atoms2.uploadStatusAtom)
			expect(restored.screentime).toEqual({ status: 'done', uploadCount: 3 })
			expect(restored.chatgpt).toEqual({ status: 'uploading' })
		})

		it('persists status of "waiting" for a platform (covers DataUploadHub handleExportStarted path)', async () => {
			const { uploadStatusAtom } = await freshAtoms()
			const store = createStore()
			store.set(uploadStatusAtom, {
				google: { status: 'waiting' },
			})

			const atoms2 = await freshAtoms()
			const store2 = createStore()
			const value = await waitForHydration<Record<string, { status: string }>>(
				store2,
				atoms2.uploadStatusAtom,
			)
			expect(value.google).toEqual({ status: 'waiting' })
		})
	})

	// ── analysisAtom — validated storage ─────────────────────────────────────

	describe('analysisAtom — validated storage', () => {
		it('returns null when localStorage key "meldar-analysis" is absent', async () => {
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(analysisAtom)).toBeNull()
		})

		it('returns valid DiscoveryAnalysis when stored data matches discoveryAnalysisSchema', async () => {
			localStorage.setItem('meldar-analysis', JSON.stringify(validAnalysis))
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			const value = await waitForHydration<DiscoveryAnalysis | null>(store, analysisAtom)
			expect(value).toEqual(validAnalysis)
		})

		it('returns null and resets when stored data is missing a required field (schema mismatch)', async () => {
			const { recommendedApp: _, ...incomplete } = validAnalysis
			localStorage.setItem('meldar-analysis', JSON.stringify(incomplete))
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			// The validated getItem intercepts and returns null for invalid schemas
			expect(store.get(analysisAtom)).toBeNull()
		})

		it('returns null and resets when a field has the wrong type (e.g. recommendedApp is a string not an object)', async () => {
			const corrupted = { ...validAnalysis, recommendedApp: 'not an object' }
			localStorage.setItem('meldar-analysis', JSON.stringify(corrupted))
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(analysisAtom)).toBeNull()
		})

		it('returns null for a stored null value', async () => {
			localStorage.setItem('meldar-analysis', JSON.stringify(null))
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(analysisAtom)).toBeNull()
		})

		it('returns null when localStorage contains corrupt JSON string — Jotai JSON.parse throws before reaching the custom getItem override; atom must recover to null without crashing the app', async () => {
			localStorage.setItem('meldar-analysis', '{invalid json')
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			expect(() => store.get(analysisAtom)).not.toThrow()
			const value = store.get(analysisAtom)
			expect(value).toBeNull()
		})

		it('does not throw when localStorage.setItem throws QuotaExceededError', async () => {
			const { analysisAtom } = await freshAtoms()
			const store = createStore()
			vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
				throw new DOMException('QuotaExceededError', 'QuotaExceededError')
			})

			expect(() => store.set(analysisAtom, validAnalysis)).not.toThrow()
		})
	})

	// ── adaptiveFollowUpsAtom ───────────────────────────────────────────────

	describe('adaptiveFollowUpsAtom', () => {
		it('initializes to []', async () => {
			const { adaptiveFollowUpsAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(adaptiveFollowUpsAtom)).toEqual([])
		})

		it('persists array of AdaptiveFollowUpItem objects', async () => {
			const items: AdaptiveFollowUpItem[] = [
				{
					type: 'screenshot',
					id: 'fu-1',
					appName: 'Instagram',
					title: 'Show us your Instagram usage',
					description: 'Upload a screenshot of your Instagram screen time',
				},
				{
					type: 'question',
					id: 'fu-2',
					title: 'How often do you cook?',
					description: 'Tell us about your cooking habits',
					options: ['Daily', 'A few times a week', 'Rarely'],
				},
			]

			const { adaptiveFollowUpsAtom } = await freshAtoms()
			const store = createStore()
			store.set(adaptiveFollowUpsAtom, items)

			const atoms2 = await freshAtoms()
			const store2 = createStore()
			const value = await waitForHydration<AdaptiveFollowUpItem[]>(
				store2,
				atoms2.adaptiveFollowUpsAtom,
			)
			expect(value).toEqual(items)
		})
	})

	// ── adaptiveAnswersAtom ─────────────────────────────────────────────────

	describe('adaptiveAnswersAtom', () => {
		it('initializes to {}', async () => {
			const { adaptiveAnswersAtom } = await freshAtoms()
			const store = createStore()
			expect(store.get(adaptiveAnswersAtom)).toEqual({})
		})

		it('persists answer string keyed by follow-up id', async () => {
			const answers = {
				'fu-1': 'Daily',
				'fu-2': 'I use it for recipes',
			}

			const { adaptiveAnswersAtom } = await freshAtoms()
			const store = createStore()
			store.set(adaptiveAnswersAtom, answers)

			const atoms2 = await freshAtoms()
			const store2 = createStore()
			const value = await waitForHydration<Record<string, string>>(
				store2,
				atoms2.adaptiveAnswersAtom,
			)
			expect(value).toEqual(answers)
		})
	})
})
