import { Box, Flex, styled } from '@styled-system/jsx'
import type { ProjectStep } from '@/entities/project-step'
import { computeStepWidthPct } from './lib/step-progress'

export type StepIndicatorProps = {
	readonly step: ProjectStep
}

export function StepIndicator({ step }: StepIndicatorProps) {
	const widthPct = computeStepWidthPct(step)

	return (
		<Flex alignItems="center" gap={3} minWidth={0}>
			<Box
				width="200px"
				height="2px"
				borderRadius="full"
				background="outlineVariant/40"
				position="relative"
				overflow="hidden"
				flexShrink={0}
			>
				<Box
					position="absolute"
					insetInlineStart={0}
					insetBlockStart={0}
					insetBlockEnd={0}
					width={widthPct}
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
				/>
			</Box>
			<styled.span
				textStyle="body.xs"
				color="onSurfaceVariant"
				fontWeight="500"
				whiteSpace="nowrap"
			>
				{step.label} · {step.current} of {step.total}
			</styled.span>
		</Flex>
	)
}
