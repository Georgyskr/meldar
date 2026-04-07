import type { KanbanCard } from '@/entities/kanban-card'

export type TopologicalSortResult =
	| { ok: true; sorted: readonly KanbanCard[] }
	| { ok: false; error: 'cycle_detected' }

export function topologicalSort(subtasks: readonly KanbanCard[]): TopologicalSortResult {
	if (subtasks.length === 0) return { ok: true, sorted: [] }

	const byId = new Map<string, KanbanCard>()
	for (const s of subtasks) {
		byId.set(s.id, s)
	}

	const inDegree = new Map<string, number>()
	const adjacency = new Map<string, string[]>()
	const ids = new Set<string>()

	for (const s of subtasks) {
		ids.add(s.id)
		if (!inDegree.has(s.id)) inDegree.set(s.id, 0)
		if (!adjacency.has(s.id)) adjacency.set(s.id, [])

		for (const dep of s.dependsOn) {
			if (!ids.has(dep) && !byId.has(dep)) continue
			const adj = adjacency.get(dep)
			if (adj) {
				adj.push(s.id)
			} else {
				adjacency.set(dep, [s.id])
			}
			inDegree.set(s.id, (inDegree.get(s.id) ?? 0) + 1)
		}
	}

	const queue: string[] = []
	for (const id of ids) {
		if ((inDegree.get(id) ?? 0) === 0) {
			queue.push(id)
		}
	}

	const sorted: KanbanCard[] = []
	while (queue.length > 0) {
		const current = queue.shift()
		if (current === undefined) break
		const card = byId.get(current)
		if (card) sorted.push(card)

		for (const neighbor of adjacency.get(current) ?? []) {
			const deg = (inDegree.get(neighbor) ?? 1) - 1
			inDegree.set(neighbor, deg)
			if (deg === 0) queue.push(neighbor)
		}
	}

	if (sorted.length !== subtasks.length) {
		return { ok: false, error: 'cycle_detected' }
	}

	return { ok: true, sorted }
}
