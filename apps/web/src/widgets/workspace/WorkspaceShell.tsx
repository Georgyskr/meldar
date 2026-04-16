'use client'

import { consumeSseStream } from '@meldar/orchestrator'
import { Box, Flex } from '@styled-system/jsx'
import { useCallback, useEffect, useRef } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import type { KanbanCard } from '@/features/kanban'
import { FirstBuildCelebration } from '@/features/kanban'
import type { FeedbackRequest } from '@/features/visual-feedback'
import { FeedbackBar } from '@/features/visual-feedback'
import {
	derivePipelinePhase,
	useWorkspaceBuild,
	WorkspaceBuildProvider,
} from '@/features/workspace'
import { toast } from '@/shared/ui'
import { handleSseEvent } from './lib/handle-sse-event'
import { runBuild } from './lib/run-build'
import { subscribePipelineEvents } from './lib/subscribe-pipeline-events'
import { PreviewPane } from './PreviewPane'
import { WorkspaceTopBar } from './WorkspaceTopBar'

export type WorkspaceShellProps = {
	readonly projectId: string
	readonly projectName: string
	readonly tier: string
	readonly tokenBalance: number
	readonly initialPreviewUrl: string | null
	readonly step: ProjectStep
	readonly initialKanbanCards: readonly KanbanCard[]
	readonly subdomain: string | null
}

export function WorkspaceShell(props: WorkspaceShellProps) {
	return (
		<WorkspaceBuildProvider
			projectId={props.projectId}
			initialPreviewUrl={props.initialPreviewUrl}
			initialKanbanCards={props.initialKanbanCards}
		>
			<Flex
				direction="column"
				position="fixed"
				inset={0}
				zIndex={40}
				bg="surface"
				color="onSurface"
			>
				<WorkspaceTopBar
					projectId={props.projectId}
					projectName={props.projectName}
					subdomain={props.subdomain}
				/>

				<WorkspaceBody projectId={props.projectId} />
			</Flex>

			<FirstBuildCelebrationBridge projectId={props.projectId} />
		</WorkspaceBuildProvider>
	)
}

function WorkspaceBody({ projectId }: { readonly projectId: string }) {
	const workspace = useWorkspaceBuild()
	const {
		activeBuildCardId,
		failureMessage,
		publish,
		previewUrl,
		writtenFiles,
		lastBuildAt,
		cards,
		markPipelineStarting,
	} = workspace
	const phase = derivePipelinePhase(workspace)
	const pipelineBusy = phase.kind === 'building' || phase.kind === 'deploying'
	const buildJustFinished = lastBuildAt !== null && writtenFiles.length > 0 && !activeBuildCardId
	const autoBuildStartedRef = useRef(false)
	const autoBuildControllerRef = useRef<AbortController | null>(null)

	useEffect(() => {
		if (autoBuildStartedRef.current && failureMessage !== null) {
			autoBuildStartedRef.current = false
			autoBuildControllerRef.current = null
		}
		if (autoBuildStartedRef.current) return
		if (activeBuildCardId) return
		if (cards.length === 0) return
		const hasUnbuiltWork = cards.some(
			(c) => c.state === 'ready' || c.state === 'draft' || c.state === 'building',
		)
		if (!hasUnbuiltWork) return
		autoBuildStartedRef.current = true
		const controller = new AbortController()
		autoBuildControllerRef.current = controller
		markPipelineStarting()
		runAutoBuild(projectId, publish, controller.signal)
	}, [
		projectId,
		cards,
		previewUrl,
		activeBuildCardId,
		failureMessage,
		publish,
		markPipelineStarting,
	])

	useEffect(() => {
		return () => {
			autoBuildControllerRef.current?.abort()
		}
	}, [])

	const handleFeedbackSubmit = useCallback(
		async (feedback: FeedbackRequest) => {
			await runBuild(projectId, activeBuildCardId || undefined, feedback.instruction, publish)
		},
		[projectId, activeBuildCardId, publish],
	)

	return (
		<>
			<Box flex="1" position="relative" minHeight={0}>
				<PreviewPane
					previewUrl={previewUrl}
					activeBuildCardId={activeBuildCardId}
					writtenFiles={writtenFiles}
					buildJustFinished={buildJustFinished}
				/>
			</Box>
			<FeedbackBar
				onSubmit={handleFeedbackSubmit}
				disabled={pipelineBusy}
				disabledReason={
					pipelineBusy ? 'Working on your current update — hold on a sec.' : undefined
				}
				draftKey={projectId}
			/>
		</>
	)
}

async function runAutoBuild(
	projectId: string,
	publish: ReturnType<typeof useWorkspaceBuild>['publish'],
	signal?: AbortSignal,
): Promise<void> {
	try {
		const response = await fetch(`/api/workspace/${projectId}/auto-build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			signal,
		})

		if (response.status === 409) {
			for await (const event of subscribePipelineEvents(projectId, signal)) {
				handleSseEvent(event, publish)
			}
			return
		}

		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as {
				error?: { code?: string; message?: string }
			}
			const message = errorBody.error?.message ?? `Auto-build failed (${response.status})`
			console.error(`[runAutoBuild] ${errorBody.error?.code ?? 'UNKNOWN'}: ${message}`)
			toast.error('Setup stalled', message)
			publish({ type: 'failed', reason: message })
			return
		}

		if (!response.body) {
			const reason = 'Server returned no stream.'
			console.error(`[runAutoBuild] ${reason}`)
			toast.error('Setup stalled', reason)
			publish({ type: 'failed', reason })
			return
		}

		for await (const event of consumeSseStream(response.body)) {
			if (signal?.aborted) return
			handleSseEvent(event, publish)
		}
	} catch (err) {
		if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
		const message = err instanceof Error ? err.message : 'Network error'
		console.error('[runAutoBuild] exception:', err)
		toast.error('Setup failed', message)
		publish({ type: 'failed', reason: message })
	}
}

function FirstBuildCelebrationBridge({ projectId }: { projectId: string }) {
	const { lastBuildReceipt, cards } = useWorkspaceBuild()
	if (!lastBuildReceipt) return null
	return <FirstBuildCelebration projectId={projectId} receipt={lastBuildReceipt} cards={cards} />
}
