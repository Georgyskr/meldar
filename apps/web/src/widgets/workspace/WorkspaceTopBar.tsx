import { Flex } from '@styled-system/jsx'
import type { ProjectStep } from '@/entities/project-step'
import { TokenBalancePill } from '@/features/token-economy'
import { Heading, Text } from '@/shared/ui'
import { NewProjectButton } from './NewProjectButton'
import { StepIndicator } from './StepIndicator'

export type WorkspaceTopBarProps = {
	readonly projectName: string
	readonly step: ProjectStep
	readonly tokenBalance: number
}

export function WorkspaceTopBar({ projectName, step, tokenBalance }: WorkspaceTopBarProps) {
	return (
		<Flex
			as="header"
			alignItems="center"
			justifyContent="space-between"
			height="48px"
			paddingInline={5}
			bg="surface"
			borderBlockEnd="2px solid"
			borderColor="onSurface"
			flexShrink={0}
			gap={5}
		>
			<Flex alignItems="center" gap={3} minWidth={0}>
				<Text textStyle="tertiary.sm" color="primary">
					meldar
				</Text>
				<Text color="onSurface/20" aria-hidden>
					/
				</Text>
				<Heading
					as="h1"
					textStyle="primary.xs"
					color="onSurface"
					whiteSpace="nowrap"
					overflow="hidden"
					textOverflow="ellipsis"
				>
					{projectName}
				</Heading>
				<TokenBalancePill balance={tokenBalance} />
			</Flex>
			<Flex alignItems="center" gap={4}>
				<StepIndicator step={step} />
				<NewProjectButton />
			</Flex>
		</Flex>
	)
}
