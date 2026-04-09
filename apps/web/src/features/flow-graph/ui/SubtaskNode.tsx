'use client'

import { Flex, HStack } from '@styled-system/jsx'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import type { KanbanCardState } from '@/entities/kanban-card'
import { userVisibleLabel } from '@/features/kanban'
import { Text } from '@/shared/ui'
import type { SubtaskNodeType } from '../lib/cards-to-flow'

const BORDER_COLORS: Record<KanbanCardState, string> = {
	draft: '#cbd5e1',
	ready: '#c084a8',
	queued: '#c084a8',
	building: '#623153',
	built: '#4ade80',
	failed: '#f87171',
	needs_rework: '#fbbf24',
}

const PILL_STYLES: Record<KanbanCardState, { bg: string; color: string }> = {
	draft: { bg: '#f1f5f9', color: '#64748b' },
	ready: { bg: '#f3e8ee', color: '#623153' },
	queued: { bg: '#f3e8ee', color: '#623153' },
	building: { bg: '#ede3e8', color: '#623153' },
	built: { bg: '#f0fdf4', color: '#15803d' },
	failed: { bg: '#fef2f2', color: '#b91c1c' },
	needs_rework: { bg: '#fffbeb', color: '#b45309' },
}

function formatCost(min: number | null, max: number | null): string | null {
	if (min === null && max === null) return null
	if (min !== null && max !== null && min !== max) return `~${min}-${max}`
	return `~${min ?? max}`
}

export function SubtaskNode({ data }: NodeProps<SubtaskNodeType>) {
	const { card } = data
	const borderColor = BORDER_COLORS[card.state]
	const pill = PILL_STYLES[card.state]
	const cost = formatCost(card.tokenCostEstimateMin, card.tokenCostEstimateMax)

	return (
		<>
			<Handle type="target" position={Position.Left} style={{ background: borderColor }} />
			<Flex
				direction="column"
				gap="6px"
				paddingBlock="10px"
				paddingInline="14px"
				borderRadius="lg"
				border="1.5px solid"
				borderColor={borderColor}
				background="white"
				minWidth="200px"
				maxWidth="240px"
				boxShadow="0 1px 4px rgba(0, 0, 0, 0.06)"
				transition="box-shadow 0.2s, transform 0.2s"
				_hover={{ boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)', transform: 'translateY(-1px)' }}
				cursor="pointer"
			>
				<HStack gap={2} alignItems="center">
					<Text
						textStyle="primary.xs"
						color="#1e293b"
						overflow="hidden"
						textOverflow="ellipsis"
						whiteSpace="nowrap"
						flex="1"
					>
						{card.title}
					</Text>
					<Text
						textStyle="primary.xs"
						paddingInline="5px"
						paddingBlock="1px"
						borderRadius="sm"
						background={pill.bg}
						color={pill.color}
						whiteSpace="nowrap"
						flexShrink={0}
					>
						{userVisibleLabel(card.state)}
					</Text>
				</HStack>

				<HStack gap={2} alignItems="center">
					{cost && (
						<Text textStyle="secondary.xs" color="#94a3b8" whiteSpace="nowrap">
							{cost} tokens
						</Text>
					)}
					{card.explainerText && (
						<Text
							textStyle="italic.md"
							color="#623153"
							overflow="hidden"
							textOverflow="ellipsis"
							whiteSpace="nowrap"
							flex="1"
							title={card.explainerText}
						>
							{card.explainerText}
						</Text>
					)}
				</HStack>
			</Flex>
			<Handle type="source" position={Position.Right} style={{ background: borderColor }} />
		</>
	)
}
