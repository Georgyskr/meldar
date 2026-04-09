'use client'

import { Flex, HStack, styled } from '@styled-system/jsx'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import type { MilestoneState } from '@/entities/kanban-card'
import { Text } from '@/shared/ui'
import type { MilestoneNodeType } from '../lib/cards-to-flow'

const BORDER_COLORS: Record<MilestoneState, string> = {
	not_started: '#94a3b8',
	in_progress: '#623153',
	complete: '#22c55e',
	needs_attention: '#f59e0b',
}

const STATE_BADGES: Record<MilestoneState, { label: string; bg: string; color: string }> = {
	not_started: { label: 'Not started', bg: '#f1f5f9', color: '#64748b' },
	in_progress: { label: 'In progress', bg: '#f3e8ee', color: '#623153' },
	complete: { label: 'Complete', bg: '#f0fdf4', color: '#15803d' },
	needs_attention: { label: 'Attention', bg: '#fffbeb', color: '#b45309' },
}

export function MilestoneNode({ data }: NodeProps<MilestoneNodeType>) {
	const { card, subtaskCount, doneCount, milestoneState } = data
	const borderColor = BORDER_COLORS[milestoneState]
	const badge = STATE_BADGES[milestoneState]

	return (
		<>
			<Handle type="target" position={Position.Left} style={{ background: borderColor }} />
			<Flex
				direction="column"
				gap={2}
				paddingBlock={3}
				paddingInline={4}
				borderRadius="xl"
				border="2px solid"
				borderColor={borderColor}
				background="white"
				minWidth="260px"
				maxWidth="280px"
				boxShadow="0 2px 8px rgba(0, 0, 0, 0.08)"
				transition="box-shadow 0.2s, transform 0.2s"
				_hover={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)', transform: 'translateY(-1px)' }}
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
						paddingInline="6px"
						paddingBlock="2px"
						borderRadius="full"
						background={badge.bg}
						color={badge.color}
						whiteSpace="nowrap"
						flexShrink={0}
					>
						{badge.label}
					</Text>
				</HStack>

				{card.description && (
					<Text
						textStyle="secondary.xs"
						as="p"
						color="#64748b"
						overflow="hidden"
						textOverflow="ellipsis"
						lineClamp={2}
					>
						{card.description}
					</Text>
				)}

				{subtaskCount > 0 && (
					<HStack gap={2} alignItems="center">
						<styled.div
							flex="1"
							height="4px"
							borderRadius="full"
							background="#e2e8f0"
							overflow="hidden"
						>
							<styled.div
								height="100%"
								borderRadius="full"
								background={milestoneState === 'complete' ? '#22c55e' : '#623153'}
								transition="width 0.3s ease"
								style={{ width: `${(doneCount / subtaskCount) * 100}%` }}
							/>
						</styled.div>
						<Text textStyle="secondary.xs" color="#94a3b8" whiteSpace="nowrap" flexShrink={0}>
							{doneCount}/{subtaskCount}
						</Text>
					</HStack>
				)}
			</Flex>
			<Handle type="source" position={Position.Right} style={{ background: borderColor }} />
		</>
	)
}
