import { Flex } from '@styled-system/jsx'
import Link from 'next/link'
import { Heading, Text } from '@/shared/ui'
import { NewProjectButton } from './NewProjectButton'
import { WorkspaceNav } from './WorkspaceNav'

export type WorkspaceTopBarProps = {
	readonly projectId: string
	readonly projectName: string
	readonly subdomain: string | null
}

export function WorkspaceTopBar({ projectId, projectName, subdomain }: WorkspaceTopBarProps) {
	return (
		<Flex
			as="header"
			direction="column"
			bg="surface"
			borderBlockEnd="2px solid"
			borderColor="onSurface"
			flexShrink={0}
		>
			<Flex
				alignItems="center"
				justifyContent="space-between"
				height="48px"
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
					<Link href="/workspace" style={{ textDecoration: 'none' }}>
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
					</Link>
				</Flex>
				<Flex alignItems="center" gap={4}>
					<NewProjectButton />
				</Flex>
			</Flex>
			<WorkspaceNav projectId={projectId} subdomain={subdomain} />
		</Flex>
	)
}
