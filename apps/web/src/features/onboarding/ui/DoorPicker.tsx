'use client'

import { styled, VStack } from '@styled-system/jsx'
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
		description: 'Browse real examples and pick one to start from.',
	},
	{
		id: 'c',
		icon: '💡',
		label: 'I have an idea but not sure where to start',
		description: 'Describe what you need and we\u2019ll figure it out together.',
	},
]

const DoorButton = styled('button', {
	base: {
		display: 'flex',
		gap: '3.5',
		alignItems: 'flex-start',
		paddingInline: '5',
		paddingBlock: '4',
		border: '1px solid',
		borderColor: 'outlineVariant',
		borderRadius: 'xl',
		background: 'surfaceContainerLowest',
		cursor: 'pointer',
		textAlign: 'start',
		width: '100%',
		minHeight: '44px',
		transition: 'all 0.15s',
		_hover: { borderColor: 'primary/50' },
		_focusVisible: {
			outline: '2px solid',
			outlineColor: 'primary',
			outlineOffset: '2px',
		},
	},
})

export function DoorPicker({ onSelectDoor }: Props) {
	return (
		<VStack gap="8" alignItems="center" paddingBlock="12" paddingInline="6">
			<VStack gap="2" alignItems="center">
				<Heading as="h1" textStyle="primary.xl">
					What do you need today?
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Pick a starting point.
				</Text>
			</VStack>

			<VStack gap="3" width="100%" maxWidth="420px">
				{DOORS.map((door) => (
					<DoorButton key={door.id} type="button" onClick={() => onSelectDoor(door.id)}>
						<Text as="span" textStyle="primary.md" aria-hidden>
							{door.icon}
						</Text>
						<VStack gap="1" alignItems="stretch">
							<Text textStyle="label.md" color="onSurface">
								{door.label}
							</Text>
							<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
								{door.description}
							</Text>
						</VStack>
					</DoorButton>
				))}
			</VStack>
		</VStack>
	)
}
