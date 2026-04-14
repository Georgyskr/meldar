'use client'

import { consumeSseStream } from '@meldar/orchestrator'
import { Box, Flex } from '@styled-system/jsx'
import { useCallback, useEffect, useRef } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import type { KanbanCard } from '@/features/kanban'
import { FirstBuildCelebration } from '@/features/kanban'
import type { FeedbackRequest } from '@/features/visual-feedback'
import { FeedbackBar } from '@/features/visual-feedback'
import { useWorkspaceBuild, WorkspaceBuildProvider } from '@/features/workspace'
import { toast } from '@/shared/ui'
import { hasKickedAutoBuild, markAutoBuildKicked } from './lib/auto-build-flag'
import { handleSseEvent } from './lib/handle-sse-event'
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
	const providerKey = props.initialKanbanCards.length === 0 ? 'empty' : 'loaded'

	return (
		<WorkspaceBuildProvider
			key={providerKey}
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
	const {
		activeBuildCardId,
		failureMessage,
		publish,
		previewUrl,
		writtenFiles,
		lastBuildAt,
		cards,
	} = useWorkspaceBuild()
	const buildJustFinished = lastBuildAt !== null && writtenFiles.length > 0 && !activeBuildCardId
	const autoBuildStartedRef = useRef(false)

	useEffect(() => {
		if (autoBuildStartedRef.current) return
		if (hasKickedAutoBuild(projectId)) return
		if (previewUrl) return
		if (activeBuildCardId) return
		if (cards.length === 0) return
		const hasReadyWork = cards.some((c) => c.state === 'ready' || c.state === 'draft')
		if (!hasReadyWork) return
		autoBuildStartedRef.current = true
		markAutoBuildKicked(projectId)
		runAutoBuild(projectId, publish)
	}, [projectId, cards, previewUrl, activeBuildCardId, publish])

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
					failureMessage={failureMessage}
					writtenFiles={writtenFiles}
					buildJustFinished={buildJustFinished}
				/>
			</Box>
			<FeedbackBar onSubmit={handleFeedbackSubmit} />
		</>
	)
}

async function runAutoBuild(
	projectId: string,
	publish: ReturnType<typeof useWorkspaceBuild>['publish'],
): Promise<void> {
	try {
		const response = await fetch(`/api/workspace/${projectId}/auto-build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		})

		if (response.status === 409) {
			// Build already in progress — nothing to do, the UI will pick up the stream naturally
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
			handleSseEvent(event, publish)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Network error'
		console.error('[runAutoBuild] exception:', err)
		toast.error('Setup failed', message)
		publish({ type: 'failed', reason: message })
	}
}

async function runBuild(
	projectId: string,
	cardId: string | undefined,
	prompt: string,
	publish: ReturnType<typeof useWorkspaceBuild>['publish'],
): Promise<void> {
	try {
		const body: Record<string, string> = { prompt }
		if (cardId) body.kanbanCardId = cardId

		const response = await fetch(`/api/workspace/${projectId}/build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as {
				error?: { code?: string; message?: string }
			}
			const code = errorBody.error?.code ?? 'UNKNOWN'
			const message = errorBody.error?.message ?? `Build failed (${response.status})`
			console.error(`[runBuild] ${code}: ${message} (HTTP ${response.status})`)
			toast.error('Something went sideways', message)
			publish({ type: 'failed', reason: message, kanbanCardId: cardId })
			return
		}

		if (!response.body) {
			const reason = 'Server returned no stream.'
			console.error(`[runBuild] ${reason}`)
			toast.error('Something went sideways', reason)
			publish({ type: 'failed', reason, kanbanCardId: cardId })
			return
		}

		for await (const event of consumeSseStream(response.body)) {
			handleSseEvent(event, publish)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Network error'
		console.error('[runBuild] exception:', err)
		toast.error('Build failed', message)
		publish({ type: 'failed', reason: message, kanbanCardId: cardId })
	}
}

function FirstBuildCelebrationBridge({ projectId }: { projectId: string }) {
	const { lastBuildReceipt, cards } = useWorkspaceBuild()
	if (!lastBuildReceipt) return null
	return <FirstBuildCelebration projectId={projectId} receipt={lastBuildReceipt} cards={cards} />
}
