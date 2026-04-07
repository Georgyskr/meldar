'use client'

import type { ProjectFileRow } from '@meldar/storage'
import { Box, Flex } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import type { ProjectStep } from '@/entities/project-step'
import type { KanbanCard } from '@/features/kanban'
import { WorkspaceBuildProvider } from '@/features/workspace-build'
import { LeftPane } from './LeftPane'
import { PreviewPane } from './PreviewPane'
import { WorkspaceBottomBar } from './WorkspaceBottomBar'
import { WorkspaceTopBar } from './WorkspaceTopBar'

export type WorkspaceShellProps = {
	readonly projectId: string
	readonly projectName: string
	readonly tier: string
	readonly initialPreviewUrl: string | null
	readonly currentFiles: readonly ProjectFileRow[]
	readonly step: ProjectStep
	readonly activeBuildId: string | null
	readonly initialKanbanCards: readonly KanbanCard[]
}

export function WorkspaceShell(props: WorkspaceShellProps) {
	const [pendingBuild, setPendingBuild] = useState<readonly KanbanCard[] | null>(null)

	const handleBuildRequest = useCallback((subtasks: readonly KanbanCard[]) => {
		setPendingBuild(subtasks)
	}, [])

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
				<WorkspaceTopBar projectName={props.projectName} step={props.step} />

				<Flex
					flex="1"
					minHeight={0}
					direction={{ base: 'column', lg: 'row' }}
					bg="surfaceContainerLowest"
				>
					<Box
						width={{ base: '100%', lg: '42%' }}
						borderInlineEnd={{ base: 'none', lg: '1px solid' }}
						borderBlockEnd={{ base: '1px solid', lg: 'none' }}
						borderColor="outlineVariant/30"
						display="flex"
						flexDirection="column"
						overflowY="auto"
						bg="surfaceContainerLowest"
						flexShrink={0}
					>
						<LeftPane
							projectId={props.projectId}
							projectName={props.projectName}
							activeBuildId={props.activeBuildId}
							pendingBuild={pendingBuild}
							onBuildDismiss={() => setPendingBuild(null)}
						/>
					</Box>

					<Box flex="1" position="relative" minHeight="400px">
						<PreviewPane projectName={props.projectName} />
					</Box>
				</Flex>

				<WorkspaceBottomBar tier={props.tier} onBuild={handleBuildRequest} />
			</Flex>
		</WorkspaceBuildProvider>
	)
}
