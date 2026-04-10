'use client'

import { Box, Flex } from '@styled-system/jsx'
import { Text } from '@/shared/ui'
import { gradientButton } from './glass-styles'

export function GlassPlanFooter({
	totalCards,
	buildsCompleted,
	pipelineActive,
	currentCardIndex,
	onStartBuild,
}: {
	readonly totalCards: number
	readonly buildsCompleted: number
	readonly pipelineActive: boolean
	readonly currentCardIndex: number | null
	readonly onStartBuild: () => void
}) {
	if (pipelineActive && currentCardIndex !== null) {
		return (
			<Box paddingBlock="6" paddingInline="4" textAlign="center">
				<Text textStyle="secondary.sm" color="onSurfaceVariant">
					Building step {currentCardIndex + 1} of {totalCards}...
				</Text>
				<Box
					marginBlockStart="3"
					height="4px"
					borderRadius="full"
					background="outlineVariant/20"
					overflow="hidden"
				>
					<Box
						height="100%"
						borderRadius="full"
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						transition="width 0.5s ease"
						style={{ width: `${((currentCardIndex + 1) / totalCards) * 100}%` }}
					/>
				</Box>
			</Box>
		)
	}

	if (buildsCompleted >= totalCards && totalCards > 0) {
		return (
			<Box paddingBlock="6" paddingInline="4" textAlign="center">
				<Text textStyle="secondary.md" color="success">
					All steps complete.
				</Text>
			</Box>
		)
	}

	return (
		<Flex direction="column" alignItems="center" gap="3" paddingBlock="6" paddingInline="4">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				Meldar wrote a {totalCards}-step plan.
			</Text>
			<button type="button" className={gradientButton} onClick={onStartBuild}>
				Start building →
			</button>
		</Flex>
	)
}
