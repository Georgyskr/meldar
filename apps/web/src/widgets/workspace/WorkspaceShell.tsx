'use client'

import { consumeSseStream } from '@meldar/orchestrator'
import { Box, Flex } from '@styled-system/jsx'
import { useCallback } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import type { KanbanCard } from '@/features/kanban'
import { FirstBuildCelebration } from '@/features/kanban'
import type { FeedbackRequest } from '@/features/visual-feedback'
import { FeedbackBar } from '@/features/visual-feedback'
import { useWorkspaceBuild, WorkspaceBuildProvider } from '@/features/workspace'
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
	const { activeBuildCardId, failureMessage, publish, previewUrl } = useWorkspaceBuild()

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
				/>
			</Box>
			<FeedbackBar onSubmit={handleFeedbackSubmit} />
		</>
	)
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
			const body = (await response.json().catch(() => ({}))) as {
				error?: { message?: string }
			}
			const message = body.error?.message ?? `Request failed (${response.status})`
			publish({ type: 'failed', reason: message, kanbanCardId: cardId })
			return
		}

		if (!response.body) {
			publish({
				type: 'failed',
				reason: 'Server returned no stream.',
				kanbanCardId: cardId,
			})
			return
		}

		for await (const event of consumeSseStream(response.body)) {
			publish(event)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Network error'
		publish({ type: 'failed', reason: message, kanbanCardId: cardId })
	}
}

function FirstBuildCelebrationBridge({ projectId }: { projectId: string }) {
	const { lastBuildReceipt, cards } = useWorkspaceBuild()
	if (!lastBuildReceipt) return null
	return <FirstBuildCelebration projectId={projectId} receipt={lastBuildReceipt} cards={cards} />
}
