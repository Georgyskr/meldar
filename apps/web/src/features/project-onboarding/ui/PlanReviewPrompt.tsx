'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'

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
				<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.6">
					Meldar broke down your idea into {milestoneCount} milestones. Look them over — add,
					remove, or edit anything.
				</styled.p>
				<HStack gap={3}>
					<styled.button
						onClick={() => onAccept()}
						paddingBlock={2}
						paddingInline={5}
						borderRadius="md"
						background="linear-gradient(135deg, #623153, #FFB876)"
						color="white"
						fontWeight="600"
						textStyle="body.sm"
						cursor="pointer"
						transition="opacity 0.15s"
						_hover={{ opacity: 0.9 }}
					>
						Looks good, let's build
					</styled.button>
					<styled.button
						onClick={() => onEdit()}
						paddingBlock={2}
						paddingInline={5}
						borderRadius="md"
						background="transparent"
						border="1px solid"
						borderColor="outlineVariant/50"
						color="onSurface"
						fontWeight="500"
						textStyle="body.sm"
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
