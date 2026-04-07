import { atom } from 'jotai'

export const expandedMilestonesAtom = atom<ReadonlySet<string>>(new Set<string>())

export const dismissedExplainersAtom = atom<ReadonlySet<string>>(new Set<string>())

export const editingCardIdAtom = atom<string | null>(null)
