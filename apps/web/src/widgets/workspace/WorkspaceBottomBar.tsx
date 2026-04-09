import { Flex } from '@styled-system/jsx'
import { RoadmapButton } from '@/features/workspace-roadmap'
import { Text } from '@/shared/ui'

export type WorkspaceBottomBarProps = {
	readonly tier: string
}

export function WorkspaceBottomBar({ tier }: WorkspaceBottomBarProps) {
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
				<Text textStyle="secondary.xs" color="onSurfaceVariant" flexShrink={0}>
					{tier}
				</Text>
			</Flex>

			<Flex alignItems="center" gap={2} flexShrink={0}>
				<RoadmapButton />
			</Flex>
		</Flex>
	)
}
