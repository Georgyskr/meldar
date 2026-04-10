'use client'

import { consumeSseStream, type OrchestratorEvent } from '@meldar/orchestrator'
import { Flex } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import { GlassPlanView } from '@/features/glass-plan'
import type { KanbanCard } from '@/features/kanban'
import { FirstBuildCelebration } from '@/features/kanban'
import { PricingDrawer, TokenNudgeBanner } from '@/features/token-economy'
import { useWorkspaceBuild, WorkspaceBuildProvider } from '@/features/workspace'
import { ArtifactPane } from './ArtifactPane'
import { TaskListPane } from './TaskListPane'
import { WorkspaceBottomBar } from './WorkspaceBottomBar'
import { WorkspaceEmptyState } from './WorkspaceEmptyState'
import { WorkspaceTopBar } from './WorkspaceTopBar'

export type WorkspaceShellProps = {
	readonly projectId: string
	readonly projectName: string
	readonly tier: string
	readonly tokenBalance: number
	readonly initialPreviewUrl: string | null
	readonly step: ProjectStep
	readonly initialKanbanCards: readonly KanbanCard[]
}

export function WorkspaceShell(props: WorkspaceShellProps) {
	const [pricingOpen, setPricingOpen] = useState(false)
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
					projectName={props.projectName}
					step={props.step}
					tokenBalance={props.tokenBalance}
				/>

				<TokenNudgeBanner balance={props.tokenBalance} onSeePlans={() => setPricingOpen(true)} />

				<Flex flex="1" minHeight={0} position="relative" bg="surfaceContainerLowest">
					<WorkspaceBody projectId={props.projectId} />
				</Flex>

				<WorkspaceBottomBar tier={props.tier} />
			</Flex>

			<PricingDrawer open={pricingOpen} onClose={() => setPricingOpen(false)} />

			<FirstBuildCelebrationBridge projectId={props.projectId} />
		</WorkspaceBuildProvider>
	)
}

function WorkspaceBody({ projectId }: { readonly projectId: string }) {
	const {
		cards,
		mode,
		selectedTaskId,
		activeBuildCardId,
		writtenFiles,
		lastBuildReceipt,
		failureMessage,
		deployment,
		buildsCompleted,
		lastBuildId,
		selectTask,
		publish,
	} = useWorkspaceBuild()

	const handleMakeThis = useCallback(
		(cardId: string, prompt: string) => {
			void runBuild(projectId, cardId, prompt, publish)
		},
		[projectId, publish],
	)

	const handleStartAutoBuild = useCallback(() => {
		void triggerAutoBuild(projectId, publish)
	}, [projectId, publish])

	if (cards.length === 0) {
		return <WorkspaceEmptyState projectId={projectId} />
	}

	if (mode.type === 'plan') {
		return <GlassPlanView onSelectCard={selectTask} onStartBuild={handleStartAutoBuild} />
	}

	const selectedCard = selectedTaskId ? (cards.find((c) => c.id === selectedTaskId) ?? null) : null

	return (
		<Flex width="100%" height="100%">
			<TaskListPane
				cards={cards}
				selectedTaskId={selectedTaskId}
				activeBuildCardId={activeBuildCardId}
				onSelect={selectTask}
			/>
			<ArtifactPane
				projectId={projectId}
				selectedCard={selectedCard}
				activeBuildCardId={activeBuildCardId}
				writtenFiles={writtenFiles}
				lastBuildReceipt={lastBuildReceipt}
				failureMessage={failureMessage}
				deployment={deployment}
				buildsCompleted={buildsCompleted}
				lastBuildId={lastBuildId}
				onMakeThis={handleMakeThis}
			/>
		</Flex>
	)
}

async function runBuild(
	projectId: string,
	cardId: string,
	prompt: string,
	publish: ReturnType<typeof useWorkspaceBuild>['publish'],
): Promise<void> {
	try {
		const response = await fetch(`/api/workspace/${projectId}/build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kanbanCardId: cardId,
				prompt,
			}),
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

async function triggerAutoBuild(
	projectId: string,
	publish: (event: OrchestratorEvent) => void,
): Promise<void> {
	try {
		const response = await fetch(`/api/workspace/${projectId}/auto-build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		})

		if (!response.ok) {
			const body = (await response.json().catch(() => ({}))) as {
				error?: { message?: string }
			}
			publish({
				type: 'failed',
				reason: body.error?.message ?? `Auto-build failed (${response.status})`,
			})
			return
		}

		if (!response.body) {
			publish({ type: 'failed', reason: 'Server returned no stream.' })
			return
		}

		for await (const event of consumeSseStream(response.body)) {
			publish(event)
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Network error'
		publish({ type: 'failed', reason: message })
	}
}

function FirstBuildCelebrationBridge({ projectId }: { projectId: string }) {
	const { lastBuildReceipt, cards } = useWorkspaceBuild()
	if (!lastBuildReceipt) return null
	return <FirstBuildCelebration projectId={projectId} receipt={lastBuildReceipt} cards={cards} />
}
