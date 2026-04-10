'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import type { KanbanCard } from '@/entities/kanban-card'
import { Heading, Text } from '@/shared/ui'

type Props = {
	readonly cards: readonly KanbanCard[]
	readonly selectedTaskId: string | null
	readonly activeBuildCardId: string | null
	readonly onSelect: (taskId: string) => void
}

type Grouped = {
	readonly milestones: readonly KanbanCard[]
	readonly subtasksByMilestone: ReadonlyMap<string, readonly KanbanCard[]>
}

function group(cards: readonly KanbanCard[]): Grouped {
	const milestones: KanbanCard[] = []
	const subtasksByMilestone = new Map<string, KanbanCard[]>()
	for (const card of cards) {
		if (card.parentId === null) {
			milestones.push(card)
		} else {
			const existing = subtasksByMilestone.get(card.parentId)
			if (existing) existing.push(card)
			else subtasksByMilestone.set(card.parentId, [card])
		}
	}
	milestones.sort((a, b) => a.position - b.position)
	for (const [, subs] of subtasksByMilestone) {
		subs.sort((a, b) => a.position - b.position)
	}
	return { milestones, subtasksByMilestone }
}

function stateIcon(state: KanbanCard['state']): string {
	switch (state) {
		case 'built':
			return '✓'
		case 'building':
		case 'queued':
			return '◐'
		case 'failed':
		case 'needs_rework':
			return '!'
		case 'ready':
			return '○'
		case 'draft':
			return '·'
	}
}

export function TaskListPane({ cards, selectedTaskId, activeBuildCardId, onSelect }: Props) {
	const grouped = group(cards)
	const total = grouped.milestones.reduce(
		(acc, m) => acc + (grouped.subtasksByMilestone.get(m.id)?.length ?? 0),
		0,
	)
	const done = cards.filter((c) => c.state === 'built' && c.parentId !== null).length

	return (
		<Box
			width="280px"
			minWidth="280px"
			height="100%"
			borderRight="1px solid"
			borderColor="outlineVariant/30"
			background="surfaceContainerLowest"
			overflowY="auto"
			overflowX="hidden"
		>
			<VStack alignItems="stretch" gap={0} paddingBlock={5}>
				<VStack alignItems="stretch" gap={1} paddingInline={5} paddingBlockEnd={4}>
					<Text textStyle="label.sm" color="onSurfaceVariant">
						Your plan
					</Text>
					<Heading as="h2" textStyle="secondary.lg" color="onSurface">
						{done} of {total} steps
					</Heading>
				</VStack>

				{grouped.milestones.map((milestone, milestoneIdx) => {
					const subtasks = grouped.subtasksByMilestone.get(milestone.id) ?? []
					return (
						<VStack
							key={milestone.id}
							alignItems="stretch"
							gap={0}
							paddingBlock={3}
							borderBlockStart={milestoneIdx === 0 ? 'none' : '1px solid'}
							borderColor="outlineVariant/20"
						>
							<HStack gap={2} paddingInline={5} paddingBlockEnd={2}>
								<Text textStyle="label.sm" color="onSurfaceVariant/60" minWidth="18px">
									{String(milestoneIdx + 1).padStart(2, '0')}
								</Text>
								<Text textStyle="secondary.sm" color="onSurface" fontWeight="500">
									{milestone.title}
								</Text>
							</HStack>

							<VStack alignItems="stretch" gap={0}>
								{subtasks.map((task) => {
									const isSelected = task.id === selectedTaskId
									const isActive = task.id === activeBuildCardId
									const isBuilt = task.state === 'built'
									return (
										<styled.button
											key={task.id}
											type="button"
											onClick={() => onSelect(task.id)}
											display="flex"
											alignItems="flex-start"
											gap={3}
											paddingInline={5}
											paddingBlock={2.5}
											background={isSelected ? 'primary/8' : isActive ? 'primary/4' : 'transparent'}
											borderInlineStart={isSelected ? '2px solid' : '2px solid transparent'}
											borderColor={isSelected ? 'primary' : 'transparent'}
											textAlign="left"
											cursor="pointer"
											transition="background 0.12s ease"
											_hover={{
												background: isSelected ? 'primary/8' : 'onSurface/3',
											}}
											_focusVisible={{
												outline: '2px solid',
												outlineColor: 'primary',
												outlineOffset: '-2px',
											}}
										>
											<Text
												as="span"
												textStyle="secondary.sm"
												color={isBuilt ? 'primary' : isActive ? 'primary' : 'onSurfaceVariant/50'}
												minWidth="14px"
												fontWeight={isActive ? '600' : '400'}
											>
												{stateIcon(task.state)}
											</Text>
											<Text
												as="span"
												textStyle="secondary.sm"
												color={isBuilt ? 'onSurfaceVariant' : 'onSurface'}
												flex="1"
												lineHeight="1.4"
											>
												{task.title}
											</Text>
										</styled.button>
									)
								})}
							</VStack>
						</VStack>
					)
				})}
			</VStack>
		</Box>
	)
}
