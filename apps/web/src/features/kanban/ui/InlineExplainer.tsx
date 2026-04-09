'use client'

import { Box, HStack, styled } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { X } from 'lucide-react'
import { Text } from '@/shared/ui'
import { dismissedExplainersAtom } from '../model/kanban-atoms'

export type InlineExplainerProps = {
	readonly cardId: string
	readonly text: string
}

export function InlineExplainer({ cardId, text }: InlineExplainerProps) {
	const [dismissed, setDismissed] = useAtom(dismissedExplainersAtom)

	if (dismissed.has(cardId)) return null

	const handleDismiss = () => {
		setDismissed((prev: ReadonlySet<string>) => new Set([...prev, cardId]))
	}

	return (
		<HStack gap={2} alignItems="flex-start" marginBlockStart={1}>
			<Box flex="1">
				<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant">
					{text}
				</Text>
			</Box>
			<styled.button
				type="button"
				onClick={() => handleDismiss()}
				padding="2px"
				borderRadius="sm"
				color="onSurfaceVariant"
				cursor="pointer"
				opacity={0.5}
				transition="opacity 0.15s"
				_hover={{ opacity: 1 }}
				flexShrink={0}
				aria-label="Dismiss explainer"
			>
				<X size={12} />
			</styled.button>
		</HStack>
	)
}
