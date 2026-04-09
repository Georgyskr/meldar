'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Text } from '@/shared/ui'

const StyledLink = styled(Link)

export type ContinueBannerProps = {
	readonly projectId: string
	readonly projectName: string
	readonly nextCardTitle: string | null
}

export function ContinueBanner({ projectId, projectName, nextCardTitle }: ContinueBannerProps) {
	const [dismissed, setDismissed] = useState(false)

	if (dismissed) return null

	return (
		<Box
			marginBlockEnd={8}
			paddingInline={6}
			paddingBlock={5}
			bg="surface"
			border="1px solid"
			borderColor="onSurface/15"
			borderInlineStart="3px solid"
			borderInlineStartColor="primary"
			position="relative"
			transition="all 0.2s ease"
			_hover={{ bg: 'primary/3' }}
		>
			<styled.button
				type="button"
				onClick={() => setDismissed(true)}
				position="absolute"
				top={3}
				right={3}
				bg="transparent"
				border="none"
				cursor="pointer"
				color="onSurfaceVariant/40"
				padding={1}
				_hover={{ color: 'onSurfaceVariant/70' }}
				aria-label="Dismiss"
			>
				&times;
			</styled.button>

			<Text textStyle="tertiary.sm" as="p" color="primary" marginBlockEnd={2}>
				Pick up where you left off
			</Text>
			<Text textStyle="primary.sm" as="p" color="onSurface">
				{projectName}
			</Text>
			{nextCardTitle && (
				<Text textStyle="italic.sm" as="p" color="onSurfaceVariant/60" marginBlockStart={1}>
					— Next: {nextCardTitle}
				</Text>
			)}

			<Flex
				marginBlockStart={4}
				paddingBlockStart={3}
				borderTop="1px solid"
				borderColor="onSurface/10"
			>
				<StyledLink
					href={`/workspace/${projectId}`}
					display="inline-flex"
					alignItems="center"
					gap={2}
					textDecoration="none"
					_hover={{ opacity: 0.8 }}
				>
					<Text textStyle="primary.xs" color="primary">
						Continue
					</Text>
					<ArrowRight size={14} color="#623153" />
				</StyledLink>
			</Flex>
		</Box>
	)
}
