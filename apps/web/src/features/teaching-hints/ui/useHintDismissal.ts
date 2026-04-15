'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { HintId } from './hints-data'

const STORAGE_KEY = 'meldar-dismissed-hints'

function getDismissed(): Set<HintId> {
	if (typeof window === 'undefined') return new Set()
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return new Set()
		return new Set(JSON.parse(raw) as HintId[])
	} catch {
		return new Set()
	}
}

let cached: Set<HintId> | null = null
const listeners = new Set<() => void>()
const EMPTY_DISMISSED: ReadonlySet<HintId> = new Set<HintId>()

function getSnapshot(): ReadonlySet<HintId> {
	if (!cached) cached = getDismissed()
	return cached
}

function getServerSnapshot(): ReadonlySet<HintId> {
	return EMPTY_DISMISSED
}

function subscribe(fn: () => void): () => void {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}

function persistAndNotify(dismissed: Set<HintId>) {
	cached = dismissed
	localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]))
	for (const fn of listeners) fn()
}

export function useHintDismissal() {
	const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

	const isDismissed = useCallback((id: HintId) => dismissed.has(id), [dismissed])

	const dismiss = useCallback(
		(id: HintId) => {
			const next = new Set(dismissed)
			next.add(id)
			persistAndNotify(next)
		},
		[dismissed],
	)

	return { isDismissed, dismiss }
}
