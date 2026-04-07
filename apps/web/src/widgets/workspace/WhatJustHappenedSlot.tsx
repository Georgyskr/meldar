'use client'

import { styled } from '@styled-system/jsx'
import type { BuildReceipt } from '@/features/workspace-build/context'

export type WhatJustHappenedSlotProps = {
	readonly receipt: BuildReceipt | null
}

export function WhatJustHappenedSlot({ receipt }: WhatJustHappenedSlotProps) {
	if (!receipt) return null

	return (
		<styled.span
			textStyle="body.xs"
			color="onSurfaceVariant"
			overflow="hidden"
			textOverflow="ellipsis"
			whiteSpace="nowrap"
		>
			Built {receipt.subtaskTitle} — wrote {receipt.fileCount} file
			{receipt.fileCount !== 1 ? 's' : ''} using {receipt.tokenCost} tokens
		</styled.span>
	)
}
