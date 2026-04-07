'use client'

import { Box, styled } from '@styled-system/jsx'

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
				<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.6" whiteSpace="pre-wrap">
					{content}
				</styled.p>
			</Box>
		</Box>
	)
}
