type Options = {
	readonly intervalMs?: number
	readonly maxAttempts?: number
	readonly reload?: () => void
}

type Card = { readonly id: string; readonly state: string }

const DEFAULT_INTERVAL_MS = 3000
const DEFAULT_MAX_ATTEMPTS = 40
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

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		if (signal?.aborted) return
		await sleep(intervalMs, signal)
		if (signal?.aborted) return

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
