/**
 * WorkspaceShell — the three-pane Meldar v3 workspace layout.
 *
 * - Left:    KanbanColumn (placeholder until cards are wired up)
 * - Center:  PreviewIframe pointing at the sandbox preview URL
 * - Right:   BuildPanel — prompt input + streaming orchestrator events
 *
 * RSC by default. The interactive bits (kanban card actions, build panel
 * fetching/streaming) are client islands rendered as children of this server
 * component.
 *
 * Sprint 1.5 ships the visual scaffold + the live SSE wiring. The kanban
 * card UI lands in the next iteration; for now the BuildPanel exposes a
 * raw prompt input that drives the orchestrator end-to-end.
 */

import type { ProjectFileRow } from '@meldar/storage'
import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { BuildPanel } from '@/features/workspace-build'

export type WorkspaceShellProps = {
	readonly projectId: string
	readonly projectName: string
	readonly previewUrl: string | null
	readonly fileCount: number
	readonly currentFiles: readonly ProjectFileRow[]
}

export function WorkspaceShell(props: WorkspaceShellProps) {
	return (
		<Flex
			width="100%"
			height="100vh"
			direction={{ base: 'column', lg: 'row' }}
			bg="surface"
			color="onSurface"
		>
			{/* ── Left: kanban column ─────────────────────────────────────── */}
			<Box
				width={{ base: '100%', lg: '320px' }}
				borderInlineEnd={{ base: 'none', lg: '1px solid' }}
				borderBlockEnd={{ base: '1px solid', lg: 'none' }}
				borderColor="outlineVariant/30"
				overflowY="auto"
				padding={4}
				bg="surfaceContainerLowest"
			>
				<VStack alignItems="stretch" gap={3}>
					<styled.h2 textStyle="heading.sm" fontWeight="600" color="onSurface" marginBlockEnd={1}>
						{props.projectName}
					</styled.h2>
					<styled.p textStyle="body.xs" color="onSurfaceVariant">
						{props.fileCount} {props.fileCount === 1 ? 'file' : 'files'}
					</styled.p>

					<Box
						marginBlockStart={3}
						padding={3}
						borderRadius="md"
						border="1px dashed"
						borderColor="outlineVariant/40"
					>
						<styled.p textStyle="body.xs" color="onSurfaceVariant" lineHeight="1.5">
							Kanban cards will appear here. Sprint 1 ships the storage + orchestrator backbone; the
							kanban UI lands in the next iteration.
						</styled.p>
					</Box>

					<FileTreePreview files={props.currentFiles} />
				</VStack>
			</Box>

			{/* ── Center: preview iframe ──────────────────────────────────── */}
			<Box flex="1" position="relative" minHeight="400px" bg="surfaceContainer">
				{props.previewUrl ? (
					<styled.iframe
						src={props.previewUrl}
						title={`${props.projectName} preview`}
						width="100%"
						height="100%"
						border="none"
						background="white"
					/>
				) : (
					<PreviewPlaceholder />
				)}
			</Box>

			{/* ── Right: build panel (composer + log) ─────────────────────── */}
			<Box
				width={{ base: '100%', lg: '360px' }}
				borderInlineStart={{ base: 'none', lg: '1px solid' }}
				borderBlockStart={{ base: '1px solid', lg: 'none' }}
				borderColor="outlineVariant/30"
				bg="surfaceContainerLowest"
				display="flex"
				flexDirection="column"
				minHeight={{ base: '480px', lg: 'auto' }}
			>
				<BuildPanel projectId={props.projectId} />
			</Box>
		</Flex>
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

function PreviewPlaceholder() {
	return (
		<Flex
			width="100%"
			height="100%"
			alignItems="center"
			justifyContent="center"
			direction="column"
			gap={3}
			padding={6}
		>
			<styled.div
				width="64px"
				height="64px"
				borderRadius="full"
				background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
				opacity={0.3}
			/>
			<styled.h3 textStyle="heading.sm" color="onSurfaceVariant" textAlign="center">
				Spinning up your preview…
			</styled.h3>
			<styled.p textStyle="body.sm" color="onSurfaceVariant/70" textAlign="center" maxWidth="320px">
				First-time builds take a few seconds. Subsequent loads are instant.
			</styled.p>
		</Flex>
	)
}
