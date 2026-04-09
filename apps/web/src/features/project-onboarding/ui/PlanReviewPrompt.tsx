'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import { Text } from '@/shared/ui'

export type PlanReviewPromptProps = {
	readonly milestoneCount: number
	readonly onAccept: () => void
	readonly onEdit: () => void
}

export function PlanReviewPrompt({ milestoneCount, onAccept, onEdit }: PlanReviewPromptProps) {
	return (
		<Box
			position="sticky"
			top={0}
			zIndex={10}
			paddingBlock={4}
			paddingInline={4}
			background="surfaceContainerLowest"
			borderBlockEnd="1px solid"
			borderColor="outlineVariant/30"
		>
			<VStack alignItems="stretch" gap={3}>
				<Text as="p" textStyle="secondary.sm" color="onSurface">
					Meldar broke down your idea into {milestoneCount} milestones. Look them over — add,
					remove, or edit anything.
				</Text>
				<HStack gap={3}>
					<styled.button
						type="button"
						onClick={() => onAccept()}
						paddingBlock={2}
						paddingInline={5}
						borderRadius="md"
						background="linear-gradient(135deg, #623153, #FFB876)"
						color="white"
						fontWeight="600"
						textStyle="secondary.sm"
						cursor="pointer"
						transition="opacity 0.15s"
						_hover={{ opacity: 0.9 }}
					>
						Looks good, let's build
					</styled.button>
					<styled.button
						type="button"
						onClick={() => onEdit()}
						paddingBlock={2}
						paddingInline={5}
						borderRadius="md"
						background="transparent"
						border="1px solid"
						borderColor="outlineVariant/50"
						color="onSurface"
						fontWeight="500"
						textStyle="secondary.sm"
						cursor="pointer"
						transition="all 0.15s"
						_hover={{
							borderColor: 'primary',
							color: 'primary',
						}}
					>
						I want to change something
					</styled.button>
				</HStack>
			</VStack>
		</Box>
	)
}
