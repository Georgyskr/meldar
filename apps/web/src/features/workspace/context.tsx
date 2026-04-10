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
	readonly cardId: string
	readonly subtaskTitle: string
	readonly fileCount: number
	readonly tokenCost: number
}

export type WrittenFile = {
	readonly path: string
	readonly sizeBytes: number
	readonly writtenAt: number
}

export type WorkspaceMode =
	| { readonly type: 'plan' }
	| { readonly type: 'taskFocus'; readonly taskId: string }
	| { readonly type: 'building'; readonly taskId: string }
	| { readonly type: 'review'; readonly taskId: string; readonly receipt: BuildReceipt }

export type DeploymentPhase =
	| { readonly type: 'idle' }
	| { readonly type: 'deploying'; readonly slug: string; readonly hostname: string }
	| {
			readonly type: 'deployed'
			readonly url: string
			readonly deployedAt: number
	  }
	| { readonly type: 'failed'; readonly reason: string; readonly code: string }

export type WorkspaceBuildState = {
	readonly previewUrl: string | null
	readonly lastBuildAt: number | null
	readonly cards: readonly KanbanCard[]
	readonly lastBuildReceipt: BuildReceipt | null
	readonly selectedTaskId: string | null
	readonly chatOpen: boolean
	readonly writtenFiles: readonly WrittenFile[]
	readonly activeBuildCardId: string | null
	readonly failureMessage: string | null
	readonly deployment: DeploymentPhase
	readonly buildsCompleted: number
	readonly lastBuildId: string | null
	readonly currentCardIndex: number | null
	readonly totalCards: number | null
	readonly pipelineActive: boolean
}

export type WorkspaceUiAction =
	| { type: 'ui/selectTask'; taskId: string }
	| { type: 'ui/clearSelection' }
	| { type: 'ui/openChat' }
	| { type: 'ui/closeChat' }

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
		selectedTaskId: null,
		chatOpen: false,
		writtenFiles: [],
		activeBuildCardId: null,
		failureMessage: null,
		deployment: init.initialPreviewUrl
			? { type: 'deployed', url: init.initialPreviewUrl, deployedAt: Date.now() }
			: { type: 'idle' },
		buildsCompleted: init.initialKanbanCards.filter(
			(c) => c.state === 'built' && c.parentId !== null,
		).length,
		lastBuildId: null,
		currentCardIndex: null,
		totalCards: null,
		pipelineActive: false,
	}
}

export function deriveWorkspaceMode(state: WorkspaceBuildState): WorkspaceMode {
	if (!state.selectedTaskId) return { type: 'plan' }
	const selected = state.cards.find((c) => c.id === state.selectedTaskId)
	if (!selected) return { type: 'plan' }
	if (selected.state === 'building' || selected.state === 'queued') {
		return { type: 'building', taskId: selected.id }
	}
	if (
		state.lastBuildReceipt &&
		selected.state === 'built' &&
		state.lastBuildReceipt.cardId === selected.id
	) {
		return { type: 'review', taskId: selected.id, receipt: state.lastBuildReceipt }
	}
	return { type: 'taskFocus', taskId: selected.id }
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

export type WorkspaceAction = OrchestratorEvent | WorkspaceUiAction

function isUiAction(action: WorkspaceAction): action is WorkspaceUiAction {
	return (
		action.type === 'ui/selectTask' ||
		action.type === 'ui/clearSelection' ||
		action.type === 'ui/openChat' ||
		action.type === 'ui/closeChat'
	)
}

export function workspaceBuildReducer(
	state: WorkspaceBuildState,
	action: WorkspaceAction,
): WorkspaceBuildState {
	if (isUiAction(action)) {
		switch (action.type) {
			case 'ui/selectTask':
				return { ...state, selectedTaskId: action.taskId, failureMessage: null }
			case 'ui/clearSelection':
				return { ...state, selectedTaskId: null }
			case 'ui/openChat':
				return { ...state, chatOpen: true }
			case 'ui/closeChat':
				return { ...state, chatOpen: false }
		}
	}

	switch (action.type) {
		case 'started':
			return {
				...state,
				cards: updateCardState(state.cards, action.kanbanCardId, 'building'),
				activeBuildCardId: action.kanbanCardId ?? state.selectedTaskId,
				writtenFiles: [],
				failureMessage: null,
				deployment: { type: 'idle' },
			}
		case 'file_written':
			return {
				...state,
				writtenFiles: [
					...state.writtenFiles,
					{ path: action.path, sizeBytes: action.sizeBytes, writtenAt: Date.now() },
				],
			}
		case 'sandbox_ready':
			return { ...state, previewUrl: action.previewUrl }
		case 'committed':
			return {
				...state,
				lastBuildAt: Date.now(),
				cards: updateCardState(state.cards, action.kanbanCardId, 'built', {
					tokenCostActual: action.tokenCost,
					lastBuildId: action.buildId,
					builtAt: new Date(),
				}),
				activeBuildCardId: null,
				buildsCompleted: state.buildsCompleted + 1,
				lastBuildId: action.buildId,
				lastBuildReceipt: action.kanbanCardId
					? {
							cardId: action.kanbanCardId,
							subtaskTitle: findCard(state.cards, action.kanbanCardId)?.title ?? 'Subtask',
							fileCount: action.fileCount,
							tokenCost: action.tokenCost,
						}
					: null,
			}
		case 'failed':
			return {
				...state,
				cards: updateCardState(state.cards, action.kanbanCardId, 'failed', {
					blockedReason: action.reason,
				}),
				activeBuildCardId: null,
				failureMessage: action.reason,
			}
		case 'deploying':
			return {
				...state,
				deployment: {
					type: 'deploying',
					slug: action.slug,
					hostname: action.hostname,
				},
			}
		case 'deployed':
			return {
				...state,
				previewUrl: action.url,
				deployment: {
					type: 'deployed',
					url: action.url,
					deployedAt: Date.now(),
				},
			}
		case 'deploy_failed':
			console.error(`[deploy] failed: code=${action.code} reason=${action.reason}`)
			return {
				...state,
				deployment: {
					type: 'failed',
					reason: action.reason,
					code: action.code,
				},
			}
		case 'card_started':
			return {
				...state,
				currentCardIndex: action.cardIndex,
				totalCards: action.totalCards,
				pipelineActive: true,
				cards: updateCardState(state.cards, action.cardId, 'building'),
			}
		case 'pipeline_complete':
			return {
				...state,
				currentCardIndex: null,
				totalCards: null,
				pipelineActive: false,
			}
		case 'pipeline_failed':
			return {
				...state,
				cards: updateCardState(state.cards, action.cardId, 'failed', {
					blockedReason: action.reason,
				}),
				activeBuildCardId: null,
				currentCardIndex: null,
				totalCards: null,
				pipelineActive: false,
				failureMessage: action.reason,
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
	})
		.then(async (res) => {
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				console.error(
					`[persistCardState] PATCH ${res.status} for card=${cardId}:`,
					JSON.stringify(body),
					'sent:',
					JSON.stringify(updates),
				)
			}
		})
		.catch((err) => {
			console.error('[persistCardState] network error:', err instanceof Error ? err.message : err)
		})
}

type WorkspaceBuildContextValue = WorkspaceBuildState & {
	readonly mode: WorkspaceMode
	readonly publish: (event: OrchestratorEvent) => void
	readonly selectTask: (taskId: string) => void
	readonly clearSelection: () => void
	readonly openChat: () => void
	readonly closeChat: () => void
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
			if (
				prevCard.state !== card.state &&
				(card.state === 'building' || card.state === 'built' || card.state === 'failed')
			) {
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
	const selectTask = useCallback(
		(taskId: string) => dispatch({ type: 'ui/selectTask', taskId }),
		[],
	)
	const clearSelection = useCallback(() => dispatch({ type: 'ui/clearSelection' }), [])
	const openChat = useCallback(() => dispatch({ type: 'ui/openChat' }), [])
	const closeChat = useCallback(() => dispatch({ type: 'ui/closeChat' }), [])

	const mode = useMemo(() => deriveWorkspaceMode(state), [state])

	const value = useMemo<WorkspaceBuildContextValue>(
		() => ({ ...state, mode, publish, selectTask, clearSelection, openChat, closeChat }),
		[state, mode, publish, selectTask, clearSelection, openChat, closeChat],
	)
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspaceBuild(): WorkspaceBuildContextValue {
	const ctx = useContext(Ctx)
	if (!ctx) {
		throw new Error('useWorkspaceBuild must be used inside <WorkspaceBuildProvider>')
	}
	return ctx
}
