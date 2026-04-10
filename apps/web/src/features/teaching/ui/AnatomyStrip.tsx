'use client'

import { Box, Flex } from '@styled-system/jsx'
import type { PromptAnatomy } from '@/features/kanban'
import { Text } from '@/shared/ui'

const SEGMENT_LABELS: Record<string, { label: string; hint: string }> = {
	role: { label: 'Who', hint: 'who should the AI pretend to be' },
	context: { label: 'Background', hint: 'what the AI needs to know first' },
	task: { label: 'The ask', hint: 'what you want it to make' },
	constraints: { label: 'Limits', hint: 'what it should NOT do' },
	format: { label: 'Shape', hint: 'how the result should look' },
}

const SEGMENT_ORDER = ['role', 'context', 'task', 'constraints', 'format'] as const

export function AnatomyStrip({ anatomy }: { readonly anatomy: PromptAnatomy }) {
	const foundSet = new Set(anatomy.segments.map((s) => s.type))

	return (
		<Flex gap={3} flexWrap="wrap" alignItems="center">
			{SEGMENT_ORDER.map((seg) => {
				const present = foundSet.has(seg)
				const info = SEGMENT_LABELS[seg]
				return (
					<Flex key={seg} gap={1.5} alignItems="center" title={info.hint}>
						<Box
							width="8px"
							height="8px"
							borderRadius="50%"
							background={present ? 'primary' : 'transparent'}
							border={present ? 'none' : '1.5px solid'}
							borderColor={present ? undefined : 'outlineVariant/40'}
							transition="all 0.2s ease"
						/>
						<Text
							textStyle="secondary.xs"
							color={present ? 'onSurface' : 'onSurfaceVariant/40'}
							transition="color 0.2s ease"
						>
							{info.label}
						</Text>
					</Flex>
				)
			})}
		</Flex>
	)
}
