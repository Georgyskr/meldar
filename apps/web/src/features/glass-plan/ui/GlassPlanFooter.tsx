'use client'

import { Box, Flex } from '@styled-system/jsx'
import type { PipelinePhase } from '@/features/workspace'
import { Text } from '@/shared/ui'
import { gradientButton } from './glass-styles'

export function GlassPlanFooter({
	totalCards,
	buildsCompleted,
	phase,
	onStartBuild,
}: {
	readonly totalCards: number
	readonly buildsCompleted: number
	readonly phase: PipelinePhase
	readonly onStartBuild: () => void
}) {
	if (phase.kind === 'building' && phase.cardIndex !== null && phase.totalCards !== null) {
		const pct = ((phase.cardIndex + 1) / phase.totalCards) * 100
		return (
			<Box paddingBlock="6" paddingInline="4" textAlign="center">
				<Text textStyle="secondary.sm" color="onSurfaceVariant">
					Building step {phase.cardIndex + 1} of {phase.totalCards}...
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
						style={{ width: `${pct}%` }}
					/>
				</Box>
			</Box>
		)
	}

	if (phase.kind === 'deploying') {
		return (
			<Box paddingBlock="6" paddingInline="4" textAlign="center">
				<Text textStyle="secondary.sm" color="onSurfaceVariant">
					Deploying to {phase.hostname}...
				</Text>
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
