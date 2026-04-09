'use client'

import { Box, Flex } from '@styled-system/jsx'
import { useCallback, useMemo, useState } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import { GalaxyView, kanbanToGalaxy } from '@/features/galaxy'
import type { KanbanCard } from '@/features/kanban'
import { FirstBuildCelebration } from '@/features/kanban'
import { PricingDrawer, TokenNudgeBanner } from '@/features/token-economy'
import { useWorkspaceBuild, WorkspaceBuildProvider } from '@/features/workspace'
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

				<Box flex="1" minHeight={0} position="relative" bg="surfaceContainerLowest">
					<GalaxySurface projectId={props.projectId} />
				</Box>

				<WorkspaceBottomBar tier={props.tier} />
			</Flex>

			<PricingDrawer open={pricingOpen} onClose={() => setPricingOpen(false)} />

			<FirstBuildCelebrationBridge projectId={props.projectId} />
		</WorkspaceBuildProvider>
	)
}

function GalaxySurface({ projectId }: { projectId: string }) {
	const { cards, previewUrl, selectedTaskId, mode, selectTask, clearSelection } =
		useWorkspaceBuild()
	const milestones = useMemo(() => kanbanToGalaxy(cards), [cards])

	const handleTaskSelect = useCallback((task: { id: string }) => selectTask(task.id), [selectTask])

	const handleTaskDeselect = useCallback(() => clearSelection(), [clearSelection])

	const handleBuildTask = useCallback(
		(task: { id: string }) => {
			void triggerBuildForTask(projectId, task.id)
		},
		[projectId],
	)

	if (cards.length === 0) {
		return <WorkspaceEmptyState projectId={projectId} />
	}

	const fallbackMode: 'plan' | 'taskFocus' | 'building' | 'review' =
		mode.type === 'taskFocus'
			? 'taskFocus'
			: mode.type === 'building'
				? 'building'
				: mode.type === 'review'
					? 'review'
					: 'plan'

	return (
		<GalaxyView
			milestones={milestones}
			previewUrl={previewUrl}
			selectedTaskId={selectedTaskId}
			fallbackMode={fallbackMode}
			onTaskSelect={handleTaskSelect}
			onTaskDeselect={handleTaskDeselect}
			onBuildTask={handleBuildTask}
		/>
	)
}

async function triggerBuildForTask(projectId: string, cardId: string): Promise<void> {
	try {
		const response = await fetch(`/api/workspace/${projectId}/build`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kanbanCardId: cardId,
				prompt: 'Build this task.',
			}),
		})
		if (!response.ok) {
			const body = (await response.json().catch(() => ({}))) as {
				error?: { message?: string }
			}
			console.error(
				`[WorkspaceShell] build request returned ${response.status}:`,
				body.error?.message ?? 'unknown',
			)
			return
		}
		// Drain the SSE stream so the reducer sees events via the build context.
		// The context subscribes to /api/.../build separately — here we just want
		// the side effect of kicking off the build. See Phase 3 plan: chat-triggered
		// builds will pipe events through the chat stream instead.
	} catch (err) {
		console.error('[WorkspaceShell] build trigger failed:', err)
	}
}

function FirstBuildCelebrationBridge({ projectId }: { projectId: string }) {
	const { lastBuildReceipt, cards } = useWorkspaceBuild()
	if (!lastBuildReceipt) return null
	return <FirstBuildCelebration projectId={projectId} receipt={lastBuildReceipt} cards={cards} />
}
