import { Flex, styled } from '@styled-system/jsx'
import { RoadmapButton } from '@/features/workspace-roadmap'
import { LastBuildRelativeTime } from './LastBuildRelativeTime'

export type WorkspaceBottomBarProps = {
	readonly tier: string
}

export function WorkspaceBottomBar({ tier }: WorkspaceBottomBarProps) {
	return (
		<Flex
			as="footer"
			alignItems="center"
			justifyContent="space-between"
			height="36px"
			paddingInline={5}
			bg="surface"
			borderBlockStart="1px solid"
			borderColor="outlineVariant/30"
			flexShrink={0}
			gap={4}
		>
			<Flex alignItems="center" gap={4}>
				<styled.span
					textStyle="body.xs"
					color="onSurfaceVariant"
					fontWeight="500"
					textTransform="capitalize"
				>
					{tier}
				</styled.span>
				<LastBuildRelativeTime />
			</Flex>
			<RoadmapButton />
		</Flex>
	)
}
