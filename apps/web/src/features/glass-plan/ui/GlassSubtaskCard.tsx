'use client'

import { css, cx } from '@styled-system/css'
import { Box, Flex } from '@styled-system/jsx'
import type { KanbanCard } from '@/features/kanban'
import { Text } from '@/shared/ui'
import { GlassStateBadge } from './GlassStateBadge'

const baseCard = css({
	paddingBlock: '3',
	paddingInline: '4',
	borderRadius: 'lg',
	border: '1px solid',
	borderColor: 'outlineVariant/10',
	cursor: 'pointer',
	transition: 'all 0.2s ease',
	_hover: { borderColor: 'outlineVariant/25' },
})

const buildingCard = css({
	background: 'primary/6',
	borderColor: 'primary/25',
	boxShadow: '0 0 0 1px token(colors.primary)/10%, 0 4px 24px rgba(98,49,83,0.12)',
	backgroundImage:
		'linear-gradient(135deg, transparent 40%, token(colors.primary)/8% 50%, transparent 60%)',
	backgroundSize: '200% 100%',
	animation: 'glassShimmer 2s infinite linear',
})

const builtCard = css({ borderColor: 'success/20' })
const failedCard = css({ background: 'error/4', borderColor: 'error/20' })

function cardVariant(state: string): string {
	if (state === 'building' || state === 'queued') return buildingCard
	if (state === 'built') return builtCard
	if (state === 'failed' || state === 'needs_rework') return failedCard
	return ''
}

export function GlassSubtaskCard({
	card,
	onClick,
}: {
	readonly card: KanbanCard
	readonly onClick: () => void
}) {
	return (
		<Box
			className={cx(baseCard, cardVariant(card.state))}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') onClick()
			}}
		>
			<Flex justifyContent="space-between" alignItems="center" gap="3">
				<Text textStyle="secondary.sm" color="onSurface" flex="1">
					{card.title}
				</Text>
				<GlassStateBadge state={card.state} />
			</Flex>
		</Box>
	)
}
