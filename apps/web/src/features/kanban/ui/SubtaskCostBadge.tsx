'use client'

import { styled } from '@styled-system/jsx'

export type SubtaskCostBadgeProps = {
	readonly min: number | null
	readonly max: number | null
}

export function SubtaskCostBadge({ min, max }: SubtaskCostBadgeProps) {
	if (min === null && max === null) return null

	const label =
		min !== null && max !== null && min !== max ? `~${min}–${max} tokens` : `~${min ?? max} tokens`

	return (
		<styled.span textStyle="body.xs" color="onSurfaceVariant" whiteSpace="nowrap" flexShrink={0}>
			{label}
		</styled.span>
	)
}
