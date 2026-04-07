'use client'

import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from 'react'
import type { KanbanCard, KanbanCardState } from '@/features/kanban'

export type BuildReceipt = {
	readonly subtaskTitle: string
	readonly fileCount: number
	readonly tokenCost: number
}

export type WorkspaceBuildState = {
	readonly previewUrl: string | null
	readonly lastBuildAt: number | null
	readonly cards: readonly KanbanCard[]
	readonly lastBuildReceipt: BuildReceipt | null
}

export type WorkspaceBuildInit = {
	readonly initialPreviewUrl: string | null
	readonly initialKanbanCards: readonly KanbanCard[]
}

export function workspaceBuildInitialState(init: WorkspaceBuildInit): WorkspaceBuildState {
	return {
		previewUrl: init.initialPreviewUrl,
		lastBuildAt: null,
		cards: init.initialKanbanCards,
		lastBuildReceipt: null,
	}
}

export function updateCardState(
	cards: readonly KanbanCard[],
	cardId: string | undefined,
	newState: KanbanCardState,
	updates?: Partial<KanbanCard>,
): readonly KanbanCard[] {
	if (!cardId) return cards
	return cards.map((card) =>
		card.id === cardId ? { ...card, state: newState, ...updates, updatedAt: new Date() } : card,
	)
}

export function findCard(cards: readonly KanbanCard[], cardId: string): KanbanCard | undefined {
	return cards.find((c) => c.id === cardId)
}

export function workspaceBuildReducer(
	state: WorkspaceBuildState,
	event: OrchestratorEvent,
): WorkspaceBuildState {
	switch (event.type) {
		case 'started':
			return {
				...state,
				cards: updateCardState(state.cards, event.kanbanCardId, 'building'),
			}
		case 'sandbox_ready':
			return { ...state, previewUrl: event.previewUrl }
		case 'committed':
			return {
				...state,
				lastBuildAt: Date.now(),
				cards: updateCardState(state.cards, event.kanbanCardId, 'built', {
					tokenCostActual: event.tokenCost,
					lastBuildId: event.buildId,
					builtAt: new Date(),
				}),
				lastBuildReceipt: event.kanbanCardId
					? {
							subtaskTitle: findCard(state.cards, event.kanbanCardId)?.title ?? 'Subtask',
							fileCount: event.fileCount,
							tokenCost: event.tokenCost,
						}
					: null,
			}
		case 'failed':
			return {
				...state,
				cards: updateCardState(state.cards, event.kanbanCardId, 'failed', {
					blockedReason: event.reason,
				}),
			}
		default:
			return state
	}
}

function persistCardState(projectId: string, cardId: string, updates: Record<string, unknown>) {
	fetch(`/api/workspace/${projectId}/cards/${cardId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(updates),
	}).catch((err) => {
		console.error('Failed to persist card state:', err instanceof Error ? err.message : 'Unknown')
	})
}

type WorkspaceBuildContextValue = WorkspaceBuildState & {
	readonly publish: (event: OrchestratorEvent) => void
}

const Ctx = createContext<WorkspaceBuildContextValue | null>(null)

export type WorkspaceBuildProviderProps = {
	readonly projectId: string
	readonly initialPreviewUrl: string | null
	readonly initialKanbanCards: readonly KanbanCard[]
	readonly children: ReactNode
}

export function WorkspaceBuildProvider({
	projectId,
	initialPreviewUrl,
	initialKanbanCards,
	children,
}: WorkspaceBuildProviderProps) {
	const [state, dispatch] = useReducer(
		workspaceBuildReducer,
		{ initialPreviewUrl, initialKanbanCards },
		workspaceBuildInitialState,
	)

	const prevCardsRef = useRef(state.cards)

	useEffect(() => {
		const prevCards = prevCardsRef.current
		prevCardsRef.current = state.cards

		for (const card of state.cards) {
			const prevCard = prevCards.find((c) => c.id === card.id)
			if (!prevCard) continue
			if (prevCard.state !== card.state && (card.state === 'built' || card.state === 'failed')) {
				const updates: Record<string, unknown> = { state: card.state }
				if (card.tokenCostActual !== prevCard.tokenCostActual)
					updates.tokenCostActual = card.tokenCostActual
				if (card.lastBuildId !== prevCard.lastBuildId) updates.lastBuildId = card.lastBuildId
				if (card.builtAt !== prevCard.builtAt) updates.builtAt = card.builtAt
				if (card.blockedReason !== prevCard.blockedReason)
					updates.blockedReason = card.blockedReason
				persistCardState(projectId, card.id, updates)
			}
		}
	}, [state.cards, projectId])

	const publish = useCallback((event: OrchestratorEvent) => dispatch(event), [])
	const value = useMemo<WorkspaceBuildContextValue>(() => ({ ...state, publish }), [state, publish])
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspaceBuild(): WorkspaceBuildContextValue {
	const ctx = useContext(Ctx)
	if (!ctx) {
		throw new Error('useWorkspaceBuild must be used inside <WorkspaceBuildProvider>')
	}
	return ctx
}
