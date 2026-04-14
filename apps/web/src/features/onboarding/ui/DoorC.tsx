'use client'

import { styled, VStack } from '@styled-system/jsx'
import { useCallback, useId, useState } from 'react'
import { Button, Heading, Text, Textarea } from '@/shared/ui'

type Props = {
	readonly onSubmit: (text: string) => void
	readonly onBack: () => void
}

const BackButton = styled('button', {
	base: {
		alignSelf: 'flex-start',
		background: 'transparent',
		border: 'none',
		cursor: 'pointer',
		padding: '2',
		minHeight: '44px',
		_focusVisible: {
			outline: '2px solid',
			outlineColor: 'primary',
			outlineOffset: '2px',
			borderRadius: 'sm',
		},
	},
})

export function DoorC({ onSubmit, onBack }: Props) {
	const [text, setText] = useState('')
	const textareaId = useId()

	const handleSubmit = useCallback(() => {
		if (!text.trim()) return
		onSubmit(text.trim())
	}, [text, onSubmit])

	return (
		<VStack gap="6" alignItems="stretch" paddingBlock="8" paddingInline="6">
			<BackButton type="button" onClick={onBack}>
				<Text textStyle="label.sm" color="primary">
					← Back
				</Text>
			</BackButton>

			<VStack gap="2">
				<Heading as="h1" textStyle="primary.lg">
					What's eating your time?
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Tell us in your own words. We'll figure out what you need.
				</Text>
			</VStack>

			<styled.label htmlFor={textareaId} srOnly>
				Describe what you need
			</styled.label>
			<Textarea
				id={textareaId}
				value={text}
				onChange={(e) => setText(e.target.value)}
				rows={4}
				placeholder="e.g. I run a yoga studio and clients keep calling to book classes..."
			/>

			<VStack gap="2" alignItems="stretch">
				<Text textStyle="secondary.xs" color="onSurfaceVariant">
					Others have said:
				</Text>
				{[
					'"I\'m a photographer and need a portfolio with booking"',
					'"My team wastes hours on scheduling"',
					'"I want clients to reach me without calling"',
				].map((example) => (
					<Text key={example} as="p" textStyle="secondary.xs" color="onSurfaceVariant">
						{example}
					</Text>
				))}
			</VStack>

			<Button
				type="button"
				variant="primary"
				size="lg"
				onClick={handleSubmit}
				disabled={!text.trim()}
			>
				See what Meldar suggests →
			</Button>
		</VStack>
	)
}
