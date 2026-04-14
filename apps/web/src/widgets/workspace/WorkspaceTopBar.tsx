import { Flex } from '@styled-system/jsx'
import Link from 'next/link'
import { Heading, Text } from '@/shared/ui'
import { OverflowMenu } from './OverflowMenu'

export type WorkspaceTopBarProps = {
	readonly projectId: string
	readonly projectName: string
	readonly subdomain: string | null
}

export function WorkspaceTopBar({ projectId, projectName, subdomain }: WorkspaceTopBarProps) {
	return (
		<Flex
			as="header"
			alignItems="center"
			justifyContent="space-between"
			bg="surface"
			borderBlockEnd="1px solid"
			borderColor="outlineVariant/30"
			flexShrink={0}
			height="52px"
			paddingInline={5}
			gap={5}
		>
			<Flex alignItems="center" gap={3} minWidth={0}>
				<Link href="/workspace" style={{ textDecoration: 'none' }}>
					<Text textStyle="tertiary.sm" color="primary">
						meldar
					</Text>
				</Link>
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
			</Flex>
			<OverflowMenu projectId={projectId} subdomain={subdomain} />
		</Flex>
	)
}
