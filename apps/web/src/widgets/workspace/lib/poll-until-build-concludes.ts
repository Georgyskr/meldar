type Options = {
	readonly intervalMs?: number
	readonly maxAttempts?: number
	readonly reload?: () => void
	readonly onProgress?: (info: { attempt: number; maxAttempts: number }) => void
}

type Card = { readonly id: string; readonly state: string }

const DEFAULT_INTERVAL_MS = 3000
// 80 attempts × 3s = 4 minutes. Realistic auto-build pipelines are 2-3 min;
// this gives margin for slow builds without trapping the user forever.
const DEFAULT_MAX_ATTEMPTS = 80
const TERMINAL_STATES = new Set(['built', 'failed'])

export async function pollUntilBuildConcludes(
	projectId: string,
	baselineCards: readonly Card[],
	signal?: AbortSignal,
	opts: Options = {},
): Promise<void> {
	const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
	const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
	const reload = opts.reload ?? (() => window.location.reload())
	const baseline = new Map(baselineCards.map((c) => [c.id, c.state]))
	let pipelineWasActive = true

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (signal?.aborted) return
		await sleep(intervalMs, signal)
		if (signal?.aborted) return

		opts.onProgress?.({ attempt: attempt + 1, maxAttempts })

		// Primary signal: pipeline lock. Cleared in finally → terminal.
		try {
			const res = await fetch(`/api/workspace/${projectId}/pipeline-status`, { signal })
			if (res.ok) {
				const body = (await res.json()) as { active?: boolean }
				const active = body.active === true
				if (pipelineWasActive && !active) {
					reload()
					return
				}
				pipelineWasActive = active
			}
		} catch {
			// fall through to card transition heuristic
		}

		// Fallback: card state transition (covers projects without pipeline lock yet).
		let cards: Card[] | null = null
		try {
			const res = await fetch(`/api/workspace/${projectId}/cards`, { signal })
			if (res.ok) {
				const body = (await res.json()) as { cards?: Card[] }
				cards = body.cards ?? []
			}
		} catch {
			continue
		}

		if (!cards) continue
		const transitioned = cards.some((c) => {
			if (!TERMINAL_STATES.has(c.state)) return false
			const prev = baseline.get(c.id)
			return prev !== undefined && !TERMINAL_STATES.has(prev)
		})
		if (transitioned) {
			reload()
			return
		}
	}
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const id = setTimeout(resolve, ms)
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(id)
				resolve()
			},
			{ once: true },
		)
	})
}
