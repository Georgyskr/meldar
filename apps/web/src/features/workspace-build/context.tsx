'use client'

import type { OrchestratorEvent } from '@meldar/orchestrator/types'
import { createContext, type ReactNode, useCallback, useContext, useMemo, useReducer } from 'react'

export type WorkspaceBuildState = {
	readonly previewUrl: string | null
	readonly lastBuildAt: number | null
}

export function workspaceBuildInitialState(initialPreviewUrl: string | null): WorkspaceBuildState {
	return { previewUrl: initialPreviewUrl, lastBuildAt: null }
}

export function workspaceBuildReducer(
	state: WorkspaceBuildState,
	event: OrchestratorEvent,
): WorkspaceBuildState {
	switch (event.type) {
		case 'sandbox_ready':
			return { ...state, previewUrl: event.previewUrl }
		case 'committed':
			return { ...state, lastBuildAt: Date.now() }
		default:
			return state
	}
}

type WorkspaceBuildContextValue = WorkspaceBuildState & {
	readonly publish: (event: OrchestratorEvent) => void
}

const Ctx = createContext<WorkspaceBuildContextValue | null>(null)

export type WorkspaceBuildProviderProps = {
	readonly initialPreviewUrl: string | null
	readonly children: ReactNode
}

export function WorkspaceBuildProvider({
	initialPreviewUrl,
	children,
}: WorkspaceBuildProviderProps) {
	const [state, dispatch] = useReducer(
		workspaceBuildReducer,
		initialPreviewUrl,
		workspaceBuildInitialState,
	)
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
