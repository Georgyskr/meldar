'use client'

import { Box, VStack } from '@styled-system/jsx'
import { groupCards } from '@/features/kanban'
import { useWorkspaceBuild } from '@/features/workspace'
import { Text } from '@/shared/ui'
import { GlassMilestoneSection } from './GlassMilestoneSection'
import { GlassPlanFooter } from './GlassPlanFooter'

export function GlassPlanView({
	onSelectCard,
	onStartBuild,
}: {
	readonly onSelectCard: (cardId: string) => void
	readonly onStartBuild: () => void
}) {
	const { cards, pipelineActive, currentCardIndex } = useWorkspaceBuild()

	const { milestones, subtasksByMilestone } = groupCards(cards)

	const totalSubtasks = cards.filter((c) => c.parentId !== null).length
	const builtSubtasks = cards.filter((c) => c.parentId !== null && c.state === 'built').length

	return (
		<Box
			maxWidth="640px"
			marginInline="auto"
			paddingBlock="8"
			paddingInline="6"
			width="100%"
			overflowY="auto"
			flex="1"
		>
			<VStack gap="6" alignItems="stretch">
				<Text textStyle="label.sm" color="onSurfaceVariant">
					YOUR PLAN · {builtSubtasks} of {totalSubtasks} steps done
				</Text>

				{milestones.map((milestone, i) => {
					const subtasks = subtasksByMilestone.get(milestone.id) ?? []
					const allBuilt = subtasks.every((c) => c.state === 'built')
					return (
						<GlassMilestoneSection
							key={milestone.id}
							milestone={milestone}
							subtasks={subtasks}
							index={i}
							defaultExpanded={!allBuilt}
							onSelectCard={onSelectCard}
						/>
					)
				})}

				<GlassPlanFooter
					totalCards={totalSubtasks}
					buildsCompleted={builtSubtasks}
					pipelineActive={pipelineActive}
					currentCardIndex={currentCardIndex}
					onStartBuild={onStartBuild}
				/>
			</VStack>
		</Box>
	)
}
