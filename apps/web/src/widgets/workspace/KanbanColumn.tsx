import type { ProjectFileRow } from '@meldar/storage'
import { Box, styled, VStack } from '@styled-system/jsx'

export type KanbanColumnProps = {
	readonly currentFiles: readonly ProjectFileRow[]
}

export function KanbanColumn({ currentFiles }: KanbanColumnProps) {
	return (
		<Box
			width={{ base: '100%', lg: '320px' }}
			borderInlineEnd={{ base: 'none', lg: '1px solid' }}
			borderBlockEnd={{ base: '1px solid', lg: 'none' }}
			borderColor="outlineVariant/30"
			overflowY="auto"
			padding={4}
			bg="surfaceContainerLowest"
			flexShrink={0}
		>
			<VStack alignItems="stretch" gap={3}>
				<styled.h2
					textStyle="body.xs"
					color="onSurfaceVariant"
					textTransform="uppercase"
					letterSpacing="wide"
					fontWeight="600"
					marginBlockEnd={1}
				>
					Tasks
				</styled.h2>

				<Box padding={3} borderRadius="md" border="1px dashed" borderColor="outlineVariant/40">
					<styled.p textStyle="body.xs" color="onSurfaceVariant" lineHeight="1.5">
						Kanban cards will appear here. Sprint 1 ships the orchestrator backbone; the kanban UI
						lands in the next iteration.
					</styled.p>
				</Box>

				<FileTreePreview files={currentFiles} />
			</VStack>
		</Box>
	)
}

function FileTreePreview({ files }: { files: readonly ProjectFileRow[] }) {
	if (files.length === 0) {
		return (
			<styled.p textStyle="body.xs" color="onSurfaceVariant" marginBlockStart={2}>
				(no files yet)
			</styled.p>
		)
	}
	const visible = files.slice(0, 12)
	const hidden = Math.max(0, files.length - visible.length)
	return (
		<VStack alignItems="stretch" gap={1} marginBlockStart={3}>
			<styled.p
				textStyle="body.xs"
				color="onSurfaceVariant"
				textTransform="uppercase"
				letterSpacing="wide"
				marginBlockEnd={1}
			>
				Files
			</styled.p>
			{visible.map((f) => (
				<styled.code
					key={f.path}
					textStyle="body.xs"
					color="onSurface"
					fontFamily="mono"
					whiteSpace="nowrap"
					overflow="hidden"
					textOverflow="ellipsis"
				>
					{f.path}
				</styled.code>
			))}
			{hidden > 0 && (
				<styled.p textStyle="body.xs" color="onSurfaceVariant">
					+{hidden} more
				</styled.p>
			)}
		</VStack>
	)
}
