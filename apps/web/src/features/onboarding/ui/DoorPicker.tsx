'use client'

import { VStack } from '@styled-system/jsx'
import { Heading, Text } from '@/shared/ui'

type Door = 'a' | 'b' | 'c'

type Props = {
	readonly onSelectDoor: (door: Door) => void
}

const DOORS: ReadonlyArray<{
	readonly id: Door
	readonly icon: string
	readonly label: string
	readonly description: string
}> = [
	{
		id: 'a',
		icon: '🏪',
		label: 'I need something for my business',
		description: 'Set up a booking page, client list, or site in about 30 seconds.',
	},
	{
		id: 'b',
		icon: '👀',
		label: 'Show me what this can do',
		description: 'See real examples. No commitment. Pick one if you like it.',
	},
	{
		id: 'c',
		icon: '💡',
		label: 'I have an idea but not sure where to start',
		description: 'Describe what you need and we\u2019ll figure it out together.',
	},
]

export function DoorPicker({ onSelectDoor }: Props) {
	return (
		<VStack gap="8" alignItems="center" paddingBlock="12" paddingInline="6">
			<VStack gap="2" alignItems="center">
				<Heading as="h1" textStyle="heading.1">
					What do you need today?
				</Heading>
				<Text as="p" textStyle="body.md" color="onSurfaceVariant">
					Your AI. Your app. Nobody else's.
				</Text>
			</VStack>

			<VStack gap="3" width="100%" maxWidth="420px">
				{DOORS.map((door) => (
					<button
						key={door.id}
						type="button"
						onClick={() => onSelectDoor(door.id)}
						style={{
							display: 'flex',
							gap: 14,
							alignItems: 'flex-start',
							padding: '16px 20px',
							border: '1px solid var(--colors-outline-variant)',
							borderRadius: 12,
							background: 'var(--colors-surface-container-lowest)',
							cursor: 'pointer',
							textAlign: 'left',
							width: '100%',
						}}
					>
						<span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
							{door.icon}
						</span>
						<span>
							<Text textStyle="label.md" color="onSurface">
								{door.label}
							</Text>
							<Text as="p" textStyle="body.sm" color="onSurfaceVariant">
								{door.description}
							</Text>
						</span>
					</button>
				))}
			</VStack>
		</VStack>
	)
}
