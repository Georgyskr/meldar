import { Flex, styled } from '@styled-system/jsx'
import type { ProjectStep } from '@/entities/project-step'
import { NewProjectButton } from './NewProjectButton'
import { StepIndicator } from './StepIndicator'

export type WorkspaceTopBarProps = {
	readonly projectName: string
	readonly step: ProjectStep
}

export function WorkspaceTopBar({ projectName, step }: WorkspaceTopBarProps) {
	return (
		<Flex
			as="header"
			alignItems="center"
			justifyContent="space-between"
			height="48px"
			paddingInline={5}
			bg="surface"
			borderBlockEnd="1px solid"
			borderColor="outlineVariant/30"
			flexShrink={0}
			gap={5}
		>
			<Flex alignItems="center" gap={3} minWidth={0}>
				<styled.span textStyle="body.sm" fontWeight="700" color="onSurface" letterSpacing="-0.01em">
					meldar
				</styled.span>
				<styled.span color="outlineVariant" aria-hidden>
					/
				</styled.span>
				<styled.h1
					textStyle="body.sm"
					fontWeight="600"
					color="onSurface"
					whiteSpace="nowrap"
					overflow="hidden"
					textOverflow="ellipsis"
				>
					{projectName}
				</styled.h1>
			</Flex>
			<Flex alignItems="center" gap={4}>
				<StepIndicator step={step} />
				<NewProjectButton />
			</Flex>
		</Flex>
	)
}
