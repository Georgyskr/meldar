'use client'

import { css } from '@styled-system/css'
import { Box, Flex, VStack } from '@styled-system/jsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { KanbanCard } from '@/features/kanban'
import { Heading, Text } from '@/shared/ui'
import { GlassSubtaskCard } from './GlassSubtaskCard'

const glassContainer = css({
	background: 'rgba(250, 249, 246, 0.6)',
	backdropFilter: 'blur(24px) saturate(1.3)',
	border: '1px solid',
	borderColor: 'outlineVariant/15',
	borderRadius: 'xl',
	boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(98,49,83,0.06)',
	overflow: 'hidden',
})

export function GlassMilestoneSection({
	milestone,
	subtasks,
	index,
	defaultExpanded,
	onSelectCard,
}: {
	readonly milestone: KanbanCard
	readonly subtasks: readonly KanbanCard[]
	readonly index: number
	readonly defaultExpanded: boolean
	readonly onSelectCard: (cardId: string) => void
}) {
	const [expanded, setExpanded] = useState(defaultExpanded)
	const builtCount = subtasks.filter((c) => c.state === 'built').length

	return (
		<Box className={glassContainer}>
			<Flex
				alignItems="center"
				justifyContent="space-between"
				paddingBlock="4"
				paddingInline="5"
				cursor="pointer"
				onClick={() => setExpanded(!expanded)}
				_hover={{ background: 'surface/40' }}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded)
				}}
				aria-expanded={expanded}
			>
				<Flex alignItems="center" gap="3">
					<Text textStyle="label.sm" color="primary">
						Nº{String(index + 1).padStart(2, '0')}
					</Text>
					<Heading as="h3" textStyle="secondary.md" color="onSurface">
						{milestone.title}
					</Heading>
				</Flex>
				<Flex alignItems="center" gap="3">
					<Text textStyle="label.sm" color="onSurfaceVariant">
						{builtCount}/{subtasks.length}
					</Text>
					<Box
						transition="transform 0.2s ease"
						transform={expanded ? 'rotate(0deg)' : 'rotate(-90deg)'}
					>
						<ChevronDown size={16} />
					</Box>
				</Flex>
			</Flex>

			{expanded && (
				<VStack gap="2" paddingInline="5" paddingBlockEnd="4">
					{subtasks.map((card) => (
						<GlassSubtaskCard key={card.id} card={card} onClick={() => onSelectCard(card.id)} />
					))}
				</VStack>
			)}
		</Box>
	)
}
