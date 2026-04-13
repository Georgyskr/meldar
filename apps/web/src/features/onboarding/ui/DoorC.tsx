'use client'

import { VStack } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import { Heading, Text } from '@/shared/ui'

type Props = {
	readonly onSubmit: (text: string) => void
	readonly onBack: () => void
}

export function DoorC({ onSubmit, onBack }: Props) {
	const [text, setText] = useState('')

	const handleSubmit = useCallback(() => {
		if (!text.trim()) return
		onSubmit(text.trim())
	}, [text, onSubmit])

	return (
		<VStack gap="6" alignItems="stretch" paddingBlock="8" paddingInline="6">
			<button
				type="button"
				onClick={onBack}
				style={{
					alignSelf: 'flex-start',
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					padding: '8px 0',
				}}
			>
				<Text textStyle="label.sm" color="primary">
					← Back
				</Text>
			</button>

			<VStack gap="2">
				<Heading as="h1" textStyle="heading.2">
					What's eating your time?
				</Heading>
				<Text as="p" textStyle="body.md" color="onSurfaceVariant">
					Tell us in your own words. We'll figure out what you need.
				</Text>
			</VStack>

			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				rows={4}
				placeholder="e.g. I run a yoga studio and clients keep calling to book classes..."
				style={{
					width: '100%',
					padding: '14px 16px',
					border: '1px solid var(--colors-outline-variant)',
					borderRadius: 10,
					fontFamily: 'var(--fonts-body)',
					fontSize: 14,
					lineHeight: 1.6,
					resize: 'none',
					background: 'var(--colors-surface-container-lowest)',
					boxSizing: 'border-box',
				}}
			/>

			<VStack gap="2" alignItems="stretch">
				<Text textStyle="body.xs" color="onSurfaceVariant">
					Others have said:
				</Text>
				{[
					'"I\'m a photographer and need a portfolio with booking"',
					'"My team wastes hours on scheduling"',
					'"I want clients to reach me without calling"',
				].map((example) => (
					<Text key={example} as="p" textStyle="body.xs" color="onSurfaceVariant">
						{example}
					</Text>
				))}
			</VStack>

			<button
				type="button"
				onClick={handleSubmit}
				disabled={!text.trim()}
				style={{
					padding: '14px 24px',
					border: 'none',
					borderRadius: 8,
					background: text.trim() ? 'var(--colors-primary)' : 'var(--colors-outline-variant)',
					color: 'var(--colors-surface)',
					fontFamily: 'var(--fonts-heading)',
					fontWeight: 600,
					fontSize: 14,
					cursor: text.trim() ? 'pointer' : 'not-allowed',
					opacity: text.trim() ? 1 : 0.5,
					minHeight: 44,
				}}
			>
				See what Meldar suggests →
			</button>
		</VStack>
	)
}
