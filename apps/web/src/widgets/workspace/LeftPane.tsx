'use client'

import { consumeSseStream } from '@meldar/orchestrator/sse'
import { Box, VStack } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { lazy, Suspense, useCallback, useRef } from 'react'
import { KanbanBoard, type KanbanCard, topologicalSort } from '@/features/kanban'
import { OnboardingChat } from '@/features/project-onboarding'
import { BuildPanel, useWorkspaceBuild } from '@/features/workspace-build'

const CardEditorModal = lazy(() =>
	import('@/features/kanban/ui/CardEditorModal').then((m) => ({ default: m.CardEditorModal })),
)
const BuildConfirmModal = lazy(() =>
	import('@/features/kanban/ui/BuildConfirmModal').then((m) => ({ default: m.BuildConfirmModal })),
)

export type LeftPaneProps = {
	readonly projectId: string
	readonly projectName: string
	readonly activeBuildId: string | null
	readonly pendingBuild: readonly KanbanCard[] | null
	readonly onBuildDismiss: () => void
}

export function LeftPane({
	projectId,
	projectName,
	activeBuildId,
	pendingBuild,
	onBuildDismiss,
}: LeftPaneProps) {
	const { cards, publish } = useWorkspaceBuild()
	const router = useRouter()
	const abortRef = useRef<AbortController | null>(null)

	const handlePlanGenerated = useCallback(() => {
		router.refresh()
	}, [router])

	const handleAddMilestone = useCallback(() => {}, [])

	const handleAddSubtask = useCallback((_milestoneId: string) => {}, [])

	const handleSaveCard = useCallback((_cardId: string, _updates: Record<string, unknown>) => {}, [])

	const handleDeleteCard = useCallback((_cardId: string) => {}, [])

	const handleMarkReady = useCallback((_cardId: string) => {}, [])

	const executeBuild = useCallback(
		async (subtasks: readonly KanbanCard[]) => {
			const result = topologicalSort(subtasks)
			if (!result.ok) return

			const first = result.sorted[0]
			if (!first) return

			publish({ type: 'started', buildId: '', projectId, kanbanCardId: first.id })

			abortRef.current?.abort()
			const ctrl = new AbortController()
			abortRef.current = ctrl

			const prompt = [first.description, ...(first.acceptanceCriteria ?? [])]
				.filter(Boolean)
				.join('\n')

			try {
				const response = await fetch(`/api/workspace/${projectId}/build`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt, kanbanCardId: first.id }),
					signal: ctrl.signal,
				})

				if (!response.ok) {
					let message: string
					try {
						const json = (await response.json()) as { error?: { message?: string } }
						message = json.error?.message ?? `HTTP ${response.status}`
					} catch {
						message = `HTTP ${response.status}`
					}
					publish({
						type: 'failed',
						reason: message,
						code: `http_${response.status}`,
						kanbanCardId: first.id,
					})
					return
				}

				if (!response.body) {
					publish({
						type: 'failed',
						reason: 'Server returned no response body',
						code: 'empty_body',
						kanbanCardId: first.id,
					})
					return
				}

				for await (const event of consumeSseStream(response.body, ctrl.signal)) {
					publish(event)
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return
				const reason = err instanceof Error ? err.message : String(err)
				publish({
					type: 'failed',
					reason: `Network error: ${reason}`,
					code: 'fetch_error',
					kanbanCardId: first.id,
				})
			} finally {
				abortRef.current = null
			}
		},
		[projectId, publish],
	)

	const handleConfirmBuild = useCallback(() => {
		if (pendingBuild) {
			void executeBuild(pendingBuild)
			onBuildDismiss()
		}
	}, [pendingBuild, executeBuild, onBuildDismiss])

	if (cards.length === 0) {
		return (
			<VStack flex="1" alignItems="stretch" gap={0}>
				<OnboardingChat
					projectId={projectId}
					projectName={projectName}
					onPlanGenerated={handlePlanGenerated}
				/>
				<BuildPanelSection projectId={projectId} activeBuildId={activeBuildId} />
			</VStack>
		)
	}

	return (
		<VStack flex="1" alignItems="stretch" gap={0}>
			<Box flex="1" overflowY="auto">
				<KanbanBoard
					cards={cards}
					onAddMilestone={handleAddMilestone}
					onAddSubtask={handleAddSubtask}
				/>
			</Box>

			<BuildPanelSection projectId={projectId} activeBuildId={activeBuildId} />

			<Suspense fallback={null}>
				<CardEditorModal
					cards={cards}
					onSave={handleSaveCard}
					onDelete={handleDeleteCard}
					onMarkReady={handleMarkReady}
				/>
			</Suspense>

			{pendingBuild && (
				<Suspense fallback={null}>
					<BuildConfirmModal
						subtasks={pendingBuild}
						onConfirm={handleConfirmBuild}
						onCancel={() => onBuildDismiss()}
					/>
				</Suspense>
			)}
		</VStack>
	)
}

function BuildPanelSection({
	projectId,
	activeBuildId,
}: {
	projectId: string
	activeBuildId: string | null
}) {
	return (
		<Box
			borderBlockStart="1px solid"
			borderColor="outlineVariant/30"
			minHeight="200px"
			maxHeight="40%"
			display="flex"
			flexDirection="column"
			flexShrink={0}
		>
			<BuildPanel projectId={projectId} blockedByBuildId={activeBuildId} />
		</Box>
	)
}
