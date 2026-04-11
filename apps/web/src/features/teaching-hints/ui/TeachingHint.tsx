'use client'

import { Flex, styled } from '@styled-system/jsx'
import { X } from 'lucide-react'
import { Text } from '@/shared/ui'
import type { HintId } from './hints-data'
import { HINTS } from './hints-data'
import { useHintDismissal } from './useHintDismissal'

type Props = {
	readonly hintId: HintId
}

export function TeachingHint({ hintId }: Props) {
	const { isDismissed, dismiss } = useHintDismissal()

	if (isDismissed(hintId)) return null

	const hint = HINTS.find((h) => h.id === hintId)
	if (!hint) return null

	return (
		<Flex
			role="status"
			alignItems="center"
			gap={3}
			paddingBlock={3}
			paddingInline={4}
			bg="primary/8"
			borderRadius="md"
			borderInlineStart="3px solid"
			borderColor="primary"
			animation="fadeInUp 0.3s ease-out"
		>
			<Text textStyle="secondary.sm" color="onSurface" flex={1}>
				{hint.text}
			</Text>
			<styled.button
				type="button"
				aria-label="Dismiss hint"
				onClick={() => dismiss(hintId)}
				background="none"
				border="none"
				cursor="pointer"
				padding={1}
				color="onSurfaceVariant"
				borderRadius="sm"
				flexShrink={0}
				_hover={{ color: 'onSurface' }}
				_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
			>
				<X size={14} />
			</styled.button>
		</Flex>
	)
}
