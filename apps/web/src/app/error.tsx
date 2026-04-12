'use client'

import { Flex, styled, VStack } from '@styled-system/jsx'
import { useEffect } from 'react'
import { Heading, Text } from '@/shared/ui'

export default function RootError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('[root-error-boundary]', error.digest ?? error.message)
	}, [error])

	return (
		<Flex
			minHeight="100vh"
			alignItems="center"
			justifyContent="center"
			bg="surface"
			paddingInline={6}
		>
			<VStack gap={4} maxWidth="480px" textAlign="center">
				<Heading as="h1" textStyle="primary.md" color="onSurface">
					Something went wrong
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					We hit an unexpected error. This has been logged and we're looking into it.
				</Text>
				{error.digest && (
					<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/50">
						Reference: {error.digest}
					</Text>
				)}
				<styled.button
					type="button"
					onClick={reset}
					paddingBlock={3}
					paddingInline={6}
					bg="primary"
					color="onPrimary"
					border="none"
					borderRadius="md"
					cursor="pointer"
					transition="all 0.15s"
					_hover={{ bg: 'primary/90' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<Text as="span" textStyle="button.md" color="onPrimary">
						Try again
					</Text>
				</styled.button>
			</VStack>
		</Flex>
	)
}
