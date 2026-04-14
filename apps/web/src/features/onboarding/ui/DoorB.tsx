'use client'

import { styled, VStack } from '@styled-system/jsx'
import { Button, Heading, Text } from '@/shared/ui'
import { EXAMPLE_PAGES } from '../model/example-pages'

type Props = {
	readonly onSelectExample: (exampleId: string) => void
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

export function DoorB({ onSelectExample, onBack }: Props) {
	return (
		<VStack gap="6" alignItems="stretch" paddingBlock="8" paddingInline="6">
			<BackButton type="button" onClick={onBack}>
				<Text textStyle="label.sm" color="primary">
					← Back
				</Text>
			</BackButton>

			<VStack gap="2">
				<Heading as="h1" textStyle="primary.lg">
					Real pages made with Meldar
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Tap one to make it yours. We'll swap in your details.
				</Text>
			</VStack>

			<VStack gap="3">
				{EXAMPLE_PAGES.map((ex) => (
					<VStack
						key={ex.id}
						gap="3"
						padding="5"
						border="1px solid"
						borderColor="outlineVariant/30"
						borderRadius="md"
						background="surfaceContainerLowest"
						alignItems="stretch"
					>
						<VStack gap="1" alignItems="stretch">
							<Text textStyle="label.md" color="onSurface">
								{ex.title}
							</Text>
							<Text textStyle="secondary.sm" color="onSurfaceVariant">
								{ex.description}
							</Text>
						</VStack>
						<Text textStyle="secondary.xs" color="onSurfaceVariant">
							{ex.services.map((s) => s.name).join(' · ')}
						</Text>
						<Button
							type="button"
							variant="outline"
							size="md"
							onClick={() => onSelectExample(ex.id)}
							css={{ alignSelf: 'flex-start' }}
						>
							Use this →
						</Button>
					</VStack>
				))}
			</VStack>
		</VStack>
	)
}
