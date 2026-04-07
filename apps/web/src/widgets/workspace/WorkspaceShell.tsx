import type { ProjectFileRow } from '@meldar/storage'
import { Box, Flex } from '@styled-system/jsx'
import type { ProjectStep } from '@/entities/project-step'
import { BuildPanel, WorkspaceBuildProvider } from '@/features/workspace-build'
import { KanbanColumn } from './KanbanColumn'
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
}

export function WorkspaceShell(props: WorkspaceShellProps) {
	return (
		<WorkspaceBuildProvider initialPreviewUrl={props.initialPreviewUrl}>
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
					<KanbanColumn currentFiles={props.currentFiles} />

					<Box flex="1" position="relative" minHeight="400px">
						<PreviewPane projectName={props.projectName} />
					</Box>

					<Box
						width={{ base: '100%', lg: '360px' }}
						borderInlineStart={{ base: 'none', lg: '1px solid' }}
						borderBlockStart={{ base: '1px solid', lg: 'none' }}
						borderColor="outlineVariant/30"
						bg="surfaceContainerLowest"
						display="flex"
						flexDirection="column"
						minHeight={{ base: '480px', lg: 'auto' }}
						flexShrink={0}
					>
						<BuildPanel projectId={props.projectId} blockedByBuildId={props.activeBuildId} />
					</Box>
				</Flex>

				<WorkspaceBottomBar tier={props.tier} />
			</Flex>
		</WorkspaceBuildProvider>
	)
}
