import { Box, Flex } from '@styled-system/jsx'
import type { ProjectStep } from '@/entities/project-step'
import { Text } from '@/shared/ui'
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
				background="onSurface/10"
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
					bg="primary"
					transition="width 0.3s ease"
					style={{ transformOrigin: 'left', animation: 'inkProgress 0.8s ease-out both' }}
				/>
			</Box>
			<Text textStyle="tertiary.sm" color="onSurfaceVariant" whiteSpace="nowrap">
				{step.label} · {step.current} of {step.total}
			</Text>
		</Flex>
	)
}
