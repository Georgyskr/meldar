'use client'

import { Box } from '@styled-system/jsx'
import { Text } from '@/shared/ui'

export type OnboardingMessageProps = {
	readonly role: 'user' | 'assistant'
	readonly content: string
}

export function OnboardingMessage({ role, content }: OnboardingMessageProps) {
	const isUser = role === 'user'

	return (
		<Box
			display="flex"
			justifyContent={isUser ? 'flex-end' : 'flex-start'}
			paddingInline={4}
			paddingBlock={1}
		>
			<Box
				maxWidth="80%"
				paddingBlock={3}
				paddingInline={4}
				borderRadius="xl"
				background={isUser ? 'primary/10' : 'surfaceContainerHigh'}
				borderBottomRightRadius={isUser ? 'sm' : 'xl'}
				borderBottomLeftRadius={isUser ? 'xl' : 'sm'}
			>
				<Text as="p" textStyle="secondary.sm" color="onSurface" whiteSpace="pre-wrap">
					{content}
				</Text>
			</Box>
		</Box>
	)
}
