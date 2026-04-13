'use client'

import { VStack } from '@styled-system/jsx'
import { Heading, Text } from '@/shared/ui'
import { EXAMPLE_PAGES } from '../model/example-pages'

type Props = {
	readonly onSelectExample: (exampleId: string) => void
	readonly onBack: () => void
}

export function DoorB({ onSelectExample, onBack }: Props) {
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
					Real pages made with Meldar
				</Heading>
				<Text as="p" textStyle="body.md" color="onSurfaceVariant">
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
					>
						<VStack gap="1" alignItems="stretch">
							<Text textStyle="label.md" color="onSurface">
								{ex.title}
							</Text>
							<Text textStyle="body.sm" color="onSurfaceVariant">
								{ex.description}
							</Text>
						</VStack>
						<Text textStyle="body.xs" color="onSurfaceVariant">
							{ex.services.map((s) => s.name).join(' · ')}
						</Text>
						<button
							type="button"
							onClick={() => onSelectExample(ex.id)}
							style={{
								alignSelf: 'flex-start',
								padding: '10px 20px',
								border: '1px solid var(--colors-primary)',
								borderRadius: 8,
								background: 'transparent',
								color: 'var(--colors-primary)',
								fontFamily: 'var(--fonts-heading)',
								fontWeight: 600,
								fontSize: 13,
								cursor: 'pointer',
								minHeight: 44,
							}}
						>
							Use this →
						</button>
					</VStack>
				))}
			</VStack>
		</VStack>
	)
}
