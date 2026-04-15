export type ToastType = 'error' | 'success' | 'warning' | 'info'

export type ToastItem = {
	readonly id: string
	readonly type: ToastType
	readonly title: string
	readonly description?: string
}

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 5000
const DEDUP_WINDOW_MS = 10_000

let items: readonly ToastItem[] = []
const listeners = new Set<() => void>()
const recentKeys = new Map<string, number>()

function emit() {
	for (const fn of listeners) fn()
}

function dedupKey(opts: Omit<ToastItem, 'id'>): string {
	return `${opts.type}\0${opts.title}\0${opts.description ?? ''}`
}

function addToast(opts: Omit<ToastItem, 'id'>): string {
	const key = dedupKey(opts)
	const now = Date.now()
	const lastSeen = recentKeys.get(key)
	if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) {
		const existing = items.find((i) => dedupKey(i) === key)
		if (existing) {
			recentKeys.set(key, now)
			return existing.id
		}
	}
	recentKeys.set(key, now)

	const id = crypto.randomUUID()
	items = [...items, { ...opts, id }].slice(-MAX_VISIBLE)
	emit()

	if (opts.type !== 'error') {
		setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
	}

	return id
}

function dismissToast(id: string) {
	const prev = items
	items = items.filter((i) => i.id !== id)
	if (items !== prev) emit()
}

export function subscribe(fn: () => void): () => void {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}

export function getSnapshot(): readonly ToastItem[] {
	return items
}

export const toast = Object.assign((opts: Omit<ToastItem, 'id'>) => addToast(opts), {
	error: (title: string, description?: string) => addToast({ type: 'error', title, description }),
	success: (title: string, description?: string) =>
		addToast({ type: 'success', title, description }),
	warning: (title: string, description?: string) =>
		addToast({ type: 'warning', title, description }),
	info: (title: string, description?: string) => addToast({ type: 'info', title, description }),
	dismiss: dismissToast,
})
