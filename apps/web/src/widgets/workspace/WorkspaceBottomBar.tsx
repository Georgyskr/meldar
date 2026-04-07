import { Flex, styled } from '@styled-system/jsx'
import type { KanbanCard } from '@/features/kanban'
import { BuildButton } from '@/features/kanban'
import { useWorkspaceBuild } from '@/features/workspace-build'
import { RoadmapButton } from '@/features/workspace-roadmap'
import { LastBuildRelativeTime } from './LastBuildRelativeTime'
import { WhatJustHappenedSlot } from './WhatJustHappenedSlot'

export type WorkspaceBottomBarProps = {
	readonly tier: string
	readonly onBuild: (readySubtasks: readonly KanbanCard[]) => void
}

export function WorkspaceBottomBar({ tier, onBuild }: WorkspaceBottomBarProps) {
	const { cards, lastBuildReceipt } = useWorkspaceBuild()

	return (
		<Flex
			as="footer"
			alignItems="center"
			justifyContent="space-between"
			height="44px"
			paddingInline={5}
			bg="surface"
			borderBlockStart="1px solid"
			borderColor="outlineVariant/30"
			flexShrink={0}
			gap={4}
		>
			<Flex alignItems="center" gap={4} flex="1" minWidth={0}>
				<styled.span
					textStyle="body.xs"
					color="onSurfaceVariant"
					fontWeight="500"
					textTransform="capitalize"
					flexShrink={0}
				>
					{tier}
				</styled.span>
				<LastBuildRelativeTime />
				<WhatJustHappenedSlot receipt={lastBuildReceipt} />
			</Flex>

			<Flex alignItems="center" gap={2} flexShrink={0}>
				<RoadmapButton />
				{cards.length > 0 && <BuildButton cards={cards} onBuild={onBuild} />}
			</Flex>
		</Flex>
	)
}
