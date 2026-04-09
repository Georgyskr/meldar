'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { Heading, Text } from '@/shared/ui'

export type BuildConfirmModalProps = {
	readonly subtasks: readonly KanbanCard[]
	readonly onConfirm: () => void
	readonly onCancel: () => void
}

export function BuildConfirmModal({ subtasks, onConfirm, onCancel }: BuildConfirmModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (dialog && !dialog.open) {
			dialog.showModal()
		}
	}, [])

	const totalCost = subtasks.reduce((sum, c) => {
		const avg = ((c.tokenCostEstimateMin ?? 0) + (c.tokenCostEstimateMax ?? 0)) / 2
		return sum + (avg || 3)
	}, 0)

	return (
		<styled.dialog
			ref={dialogRef}
			padding={0}
			borderRadius="xl"
			border="1px solid"
			borderColor="outlineVariant/20"
			background="surface"
			color="onSurface"
			maxWidth="480px"
			width="90vw"
			boxShadow="xl"
			_backdrop={{
				background: 'black/40',
			}}
			onCancel={() => onCancel()}
			aria-labelledby="build-confirm-title"
		>
			<VStack alignItems="stretch" gap={0}>
				<Flex
					alignItems="center"
					justifyContent="space-between"
					paddingBlockStart={5}
					paddingInline={6}
				>
					<Heading id="build-confirm-title" textStyle="secondary.lg" marginBlockEnd={2}>
						Confirm build
					</Heading>
					<styled.button
						type="button"
						onClick={() => onCancel()}
						padding={1}
						borderRadius="sm"
						color="onSurfaceVariant"
						cursor="pointer"
						transition="color 0.15s"
						_hover={{ color: 'onSurface' }}
						aria-label="Close"
					>
						<X size={18} />
					</styled.button>
				</Flex>
				<Box paddingInline={6}>
					<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" marginBlockEnd={4}>
						This will build {subtasks.length} subtask{subtasks.length > 1 ? 's' : ''} using
						approximately {Math.round(totalCost)} tokens.
					</Text>

					<VStack alignItems="stretch" gap={1}>
						{subtasks.map((s) => (
							<Flex key={s.id} alignItems="center" gap={2}>
								<Text textStyle="secondary.sm" flex="1" color="onSurface">
									{s.title}
								</Text>
								<Text textStyle="secondary.xs" color="onSurfaceVariant">
									~{((s.tokenCostEstimateMin ?? 0) + (s.tokenCostEstimateMax ?? 0)) / 2 || 3} tokens
								</Text>
							</Flex>
						))}
					</VStack>
				</Box>

				<Flex
					gap={3}
					justifyContent="flex-end"
					paddingBlock={4}
					paddingInline={6}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/20"
				>
					<styled.button
						type="button"
						onClick={() => onCancel()}
						paddingBlock={2}
						paddingInline={4}
						borderRadius="md"
						background="transparent"
						border="1px solid"
						borderColor="outlineVariant/40"
						color="onSurface"
						textStyle="secondary.sm"
						fontWeight="500"
						cursor="pointer"
						transition="background 0.15s"
						_hover={{ background: 'surfaceContainerLow' }}
					>
						Cancel
					</styled.button>
					<styled.button
						type="button"
						onClick={() => onConfirm()}
						paddingBlock={2}
						paddingInline={4}
						borderRadius="md"
						background="primary"
						color="onPrimary"
						textStyle="secondary.sm"
						fontWeight="600"
						cursor="pointer"
						transition="opacity 0.15s"
						_hover={{ opacity: 0.9 }}
					>
						Build
					</styled.button>
				</Flex>
			</VStack>
		</styled.dialog>
	)
}
