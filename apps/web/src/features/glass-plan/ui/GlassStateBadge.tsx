'use client'

import { css } from '@styled-system/css'
import { Box, Flex } from '@styled-system/jsx'
import type { KanbanCardState } from '@/features/kanban'
import { Text } from '@/shared/ui'

const STATE_CONFIG: Record<KanbanCardState, { dot: string; label: string }> = {
	draft: { dot: css({ bg: 'onSurfaceVariant', opacity: 0.3 }), label: 'To do' },
	ready: { dot: css({ bg: 'primary', opacity: 0.5 }), label: 'Ready' },
	queued: { dot: css({ bg: 'primary' }), label: 'Queued' },
	building: {
		dot: css({ bg: 'primary', animation: 'softPulse 1.6s ease-in-out infinite' }),
		label: 'Building...',
	},
	built: {
		dot: css({ bg: 'success', animation: 'checkIn 0.3s ease-out forwards' }),
		label: 'Done',
	},
	failed: { dot: css({ bg: 'error' }), label: 'Failed' },
	needs_rework: { dot: css({ bg: 'error', opacity: 0.7 }), label: 'Edit' },
}

export function GlassStateBadge({ state }: { readonly state: KanbanCardState }) {
	const config = STATE_CONFIG[state] ?? STATE_CONFIG.draft
	return (
		<Flex alignItems="center" gap="2">
			<Box width="8px" height="8px" borderRadius="full" flexShrink={0} className={config.dot} />
			<Text textStyle="label.sm" color="onSurfaceVariant">
				{config.label}
			</Text>
		</Flex>
	)
}
