export type ComposedSignal = { readonly signal: AbortSignal; readonly dispose: () => void }

export function composeAbortSignals(
	sources: ReadonlyArray<AbortSignal | undefined>,
	timeoutMs?: number,
): ComposedSignal {
	const controller = new AbortController()
	const cleanups: Array<() => void> = []

	const abort = (reason: unknown): void => controller.abort(reason)

	if (typeof timeoutMs === 'number') {
		const timer = setTimeout(() => abort(new DOMException('timeout', 'TimeoutError')), timeoutMs)
		cleanups.push(() => clearTimeout(timer))
	}

	for (const src of sources) {
		if (!src) continue
		if (src.aborted) {
			abort(src.reason)
			continue
		}
		const listener = () => abort(src.reason)
		src.addEventListener('abort', listener, { once: true })
		cleanups.push(() => src.removeEventListener('abort', listener))
	}

	return {
		signal: controller.signal,
		dispose: () => {
			for (const c of cleanups) c()
		},
	}
}
