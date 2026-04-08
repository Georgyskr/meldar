'use client'

import { consumeSseStream } from '@meldar/orchestrator/sse'
import { Box, Flex, HStack, styled, VStack } from '@styled-system/jsx'
import { LayoutList, Workflow } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { KanbanBoard, type KanbanCard, topologicalSort } from '@/features/kanban'
import { OnboardingChat, TemplatePicker } from '@/features/project-onboarding'
import { BuildPanel, useWorkspaceBuild } from '@/features/workspace-build'

const FlowGraph = dynamic(
	() => import('@/features/flow-graph').then((m) => ({ default: m.FlowGraph })),
	{ ssr: false },
)

const CardEditorModal = lazy(() =>
	import('@/features/kanban/ui/CardEditorModal').then((m) => ({ default: m.CardEditorModal })),
)
const BuildConfirmModal = lazy(() =>
	import('@/features/kanban/ui/BuildConfirmModal').then((m) => ({ default: m.BuildConfirmModal })),
)

type ViewMode = 'flow' | 'list'

export type LeftPaneProps = {
	readonly projectId: string
	readonly projectName: string
	readonly tokenBalance: number
	readonly activeBuildId: string | null
	readonly pendingBuild: readonly KanbanCard[] | null
	readonly onBuildDismiss: () => void
}

export function LeftPane({
	projectId,
	projectName,
	tokenBalance,
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

	const savingRef = useRef(false)
	const deletingRef = useRef(false)
	const markingReadyRef = useRef(false)

	const handleAddMilestone = useCallback(() => {}, [])

	const handleAddSubtask = useCallback((_milestoneId: string) => {}, [])

	const handleSaveCard = useCallback(
		async (cardId: string, updates: Record<string, unknown>) => {
			if (savingRef.current) return
			savingRef.current = true
			try {
				const res = await fetch(`/api/workspace/${projectId}/cards/${cardId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updates),
				})
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				router.refresh()
			} catch (err) {
				console.error('Save card failed:', err instanceof Error ? err.message : 'Unknown')
			} finally {
				savingRef.current = false
			}
		},
		[projectId, router],
	)

	const handleDeleteCard = useCallback(
		async (cardId: string) => {
			if (deletingRef.current) return
			deletingRef.current = true
			try {
				const res = await fetch(`/api/workspace/${projectId}/cards/${cardId}`, {
					method: 'DELETE',
				})
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				router.refresh()
			} catch (err) {
				console.error('Delete card failed:', err instanceof Error ? err.message : 'Unknown')
			} finally {
				deletingRef.current = false
			}
		},
		[projectId, router],
	)

	const handleMarkReady = useCallback(
		async (cardId: string) => {
			if (markingReadyRef.current) return
			markingReadyRef.current = true
			try {
				const res = await fetch(`/api/workspace/${projectId}/cards/${cardId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ state: 'ready' }),
				})
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				router.refresh()
			} catch (err) {
				console.error('Mark ready failed:', err instanceof Error ? err.message : 'Unknown')
			} finally {
				markingReadyRef.current = false
			}
		},
		[projectId, router],
	)

	const executeBuild = useCallback(
		async (subtasks: readonly KanbanCard[]) => {
			if (tokenBalance <= 0) {
				publish({
					type: 'failed',
					reason:
						'Insufficient token balance. Claim your daily bonus or wait for your monthly allowance.',
					code: 'insufficient_tokens',
					kanbanCardId: subtasks[0]?.id,
				})
				return
			}

			const result = topologicalSort(subtasks)
			if (!result.ok) return

			if (result.sorted.length === 0) return

			abortRef.current?.abort()
			const ctrl = new AbortController()
			abortRef.current = ctrl

			try {
				for (const card of result.sorted) {
					if (ctrl.signal.aborted) return

					publish({ type: 'started', buildId: '', projectId, kanbanCardId: card.id })

					const prompt = [card.description, ...(card.acceptanceCriteria ?? [])]
						.filter(Boolean)
						.join('\n')

					let cardCommitted = false

					const response = await fetch(`/api/workspace/${projectId}/build`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ prompt, kanbanCardId: card.id }),
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
							kanbanCardId: card.id,
						})
						return
					}

					if (!response.body) {
						publish({
							type: 'failed',
							reason: 'Server returned no response body',
							code: 'empty_body',
							kanbanCardId: card.id,
						})
						return
					}

					for await (const event of consumeSseStream(response.body, ctrl.signal)) {
						publish(event)
						if (event.type === 'committed') cardCommitted = true
						if (event.type === 'failed') return
					}

					if (!cardCommitted) return
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return
				const reason = err instanceof Error ? err.message : String(err)
				publish({
					type: 'failed',
					reason: `Network error: ${reason}`,
					code: 'fetch_error',
				})
			} finally {
				abortRef.current = null
				router.refresh()
			}
		},
		[projectId, publish, tokenBalance, router],
	)

	const handleConfirmBuild = useCallback(() => {
		if (pendingBuild) {
			void executeBuild(pendingBuild)
			onBuildDismiss()
		}
	}, [pendingBuild, executeBuild, onBuildDismiss])

	const [showChat, setShowChat] = useState(false)
	const [viewMode, setViewMode] = useState<ViewMode>('flow')

	const handleFlowBuild = useCallback(
		(readySubtasks: readonly KanbanCard[]) => {
			if (readySubtasks.length > 0) {
				void executeBuild(readySubtasks)
			}
		},
		[executeBuild],
	)

	if (cards.length === 0) {
		return (
			<VStack flex="1" alignItems="stretch" gap={0}>
				{showChat ? (
					<OnboardingChat
						projectId={projectId}
						projectName={projectName}
						onPlanGenerated={handlePlanGenerated}
					/>
				) : (
					<Box flex={1} overflowY="auto">
						<TemplatePicker
							projectId={projectId}
							onTemplateApplied={handlePlanGenerated}
							onStartChat={() => setShowChat(true)}
						/>
					</Box>
				)}
				<BuildPanelSection projectId={projectId} activeBuildId={activeBuildId} />
			</VStack>
		)
	}

	const isBuilding = cards.some((c) => c.state === 'queued' || c.state === 'building')

	return (
		<VStack flex="1" alignItems="stretch" gap={0}>
			<Flex
				alignItems="center"
				justifyContent="space-between"
				paddingInline={3}
				paddingBlock={2}
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/20"
				flexShrink={0}
			>
				<styled.h2
					textStyle="body.xs"
					color="onSurfaceVariant"
					textTransform="uppercase"
					letterSpacing="wide"
					fontWeight="600"
				>
					Your build plan
				</styled.h2>
				<HStack gap={1}>
					<ViewToggleButton
						active={viewMode === 'flow'}
						onClick={() => setViewMode('flow')}
						label="Flow view"
					>
						<Workflow size={14} />
					</ViewToggleButton>
					<ViewToggleButton
						active={viewMode === 'list'}
						onClick={() => setViewMode('list')}
						label="List view"
					>
						<LayoutList size={14} />
					</ViewToggleButton>
				</HStack>
			</Flex>

			<Box flex="1" overflow="hidden" position="relative">
				{viewMode === 'flow' ? (
					<FlowGraph
						cards={cards}
						onBuild={handleFlowBuild}
						buildDisabled={isBuilding || !!activeBuildId}
					/>
				) : (
					<Box height="100%" overflowY="auto">
						<KanbanBoard
							cards={cards}
							onAddMilestone={handleAddMilestone}
							onAddSubtask={handleAddSubtask}
						/>
					</Box>
				)}
			</Box>

			<BuildPanelSection projectId={projectId} activeBuildId={activeBuildId} />

			<Suspense fallback={null}>
				<CardEditorModal
					projectId={projectId}
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

function ViewToggleButton({
	active,
	onClick,
	label,
	children,
}: {
	active: boolean
	onClick: () => void
	label: string
	children: React.ReactNode
}) {
	return (
		<styled.button
			type="button"
			onClick={() => onClick()}
			aria-label={label}
			aria-pressed={active}
			display="flex"
			alignItems="center"
			justifyContent="center"
			width="28px"
			height="28px"
			borderRadius="md"
			border="none"
			cursor="pointer"
			transition="all 0.15s"
			background={active ? 'primary/10' : 'transparent'}
			color={active ? 'primary' : 'onSurfaceVariant'}
			_hover={{ background: active ? 'primary/15' : 'surfaceContainerLow' }}
		>
			{children}
		</styled.button>
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
