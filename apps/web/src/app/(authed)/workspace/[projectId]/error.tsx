'use client'

import { Flex, styled, VStack } from '@styled-system/jsx'
import { useEffect } from 'react'
import { Heading, Text, toast } from '@/shared/ui'

export default function WorkspaceError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('[workspace-error-boundary]', error.digest ?? error.message)
		toast.error('Something went wrong', 'Your work is saved. Try refreshing.')
	}, [error])

	return (
		<Flex
			flex={1}
			alignItems="center"
			justifyContent="center"
			bg="surface"
			paddingInline={6}
			minHeight="60vh"
		>
			<VStack gap={4} maxWidth="480px" textAlign="center">
				<Heading as="h2" textStyle="primary.sm" color="onSurface">
					This page hit a snag
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Your work is saved. Try refreshing, or go back to your projects.
				</Text>
				{error.digest && (
					<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/50">
						Ref: {error.digest}
					</Text>
				)}
				<Flex gap={3}>
					<styled.button
						type="button"
						onClick={reset}
						paddingBlock={2.5}
						paddingInline={5}
						bg="primary"
						color="onPrimary"
						border="none"
						borderRadius="md"
						cursor="pointer"
						_hover={{ bg: 'primary/90' }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						<Text as="span" textStyle="button.sm" color="onPrimary">
							Try again
						</Text>
					</styled.button>
					<styled.a
						href="/workspace"
						paddingBlock={2.5}
						paddingInline={5}
						bg="transparent"
						color="onSurface"
						border="1px solid"
						borderColor="outlineVariant/50"
						borderRadius="md"
						textDecoration="none"
						_hover={{ bg: 'onSurface/4' }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						<Text as="span" textStyle="button.sm" color="onSurface">
							Back to projects
						</Text>
					</styled.a>
				</Flex>
			</VStack>
		</Flex>
	)
}
