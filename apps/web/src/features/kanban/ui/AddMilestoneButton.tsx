'use client'

import { styled } from '@styled-system/jsx'
import { Plus } from 'lucide-react'

export type AddMilestoneButtonProps = {
	readonly onAdd: () => void
}

export function AddMilestoneButton({ onAdd }: AddMilestoneButtonProps) {
	return (
		<styled.button
			type="button"
			onClick={() => onAdd()}
			display="flex"
			alignItems="center"
			gap={2}
			width="100%"
			paddingBlock={3}
			paddingInline={4}
			borderRadius="md"
			border="1px dashed"
			borderColor="outlineVariant/40"
			background="transparent"
			color="onSurfaceVariant"
			textStyle="body.sm"
			cursor="pointer"
			transition="all 0.15s"
			_hover={{
				borderColor: 'primary/60',
				color: 'primary',
				background: 'primary/5',
			}}
		>
			<Plus size={16} />
			Add milestone
		</styled.button>
	)
}
