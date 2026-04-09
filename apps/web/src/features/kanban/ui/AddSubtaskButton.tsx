'use client'

import { styled } from '@styled-system/jsx'
import { Plus } from 'lucide-react'

export type AddSubtaskButtonProps = {
	readonly onAdd: () => void
}

export function AddSubtaskButton({ onAdd }: AddSubtaskButtonProps) {
	return (
		<styled.button
			type="button"
			onClick={() => onAdd()}
			display="flex"
			alignItems="center"
			gap={1}
			paddingBlock={1}
			paddingInline={2}
			marginInlineStart={8}
			borderRadius="sm"
			background="transparent"
			color="onSurfaceVariant"
			textStyle="secondary.xs"
			cursor="pointer"
			transition="all 0.15s"
			_hover={{
				color: 'primary',
				background: 'primary/5',
			}}
		>
			<Plus size={12} />
			Add subtask
		</styled.button>
	)
}
