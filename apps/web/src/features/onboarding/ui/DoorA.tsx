'use client'

import { Grid, styled, VStack } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import { BOOKING_VERTICALS } from '@/entities/booking-verticals'
import { Button, Heading, Input, Text } from '@/shared/ui'

type Props = {
	readonly onSubmit: (data: {
		verticalId: string
		businessName: string
		websiteUrl: string
	}) => void
	readonly onBack: () => void
	readonly initialVerticalId: string | null
	readonly initialBusinessName: string
}

const VerticalButton = styled('button', {
	base: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '2',
		paddingBlock: '4',
		paddingInline: '3',
		border: '1px solid',
		borderColor: 'outlineVariant',
		borderRadius: 'md',
		background: 'surfaceContainerLowest',
		cursor: 'pointer',
		minHeight: '44px',
		transition: 'all 0.15s',
		_hover: { borderColor: 'primary/50' },
		_focusVisible: {
			outline: '2px solid',
			outlineColor: 'primary',
			outlineOffset: '2px',
		},
	},
	variants: {
		selected: {
			true: {
				borderColor: 'primary',
				borderWidth: '2px',
				background: 'primary/5',
			},
		},
	},
})

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

export function DoorA({ onSubmit, onBack, initialVerticalId, initialBusinessName }: Props) {
	const [selectedId, setSelectedId] = useState<string | null>(initialVerticalId)
	const [businessName, setBusinessName] = useState(initialBusinessName)
	const [websiteUrl, setWebsiteUrl] = useState('')

	const handleSubmit = useCallback(() => {
		if (!selectedId) return
		onSubmit({ verticalId: selectedId, businessName, websiteUrl })
	}, [selectedId, businessName, websiteUrl, onSubmit])

	return (
		<VStack gap="6" alignItems="stretch" paddingBlock="8" paddingInline="6">
			<BackButton type="button" onClick={onBack}>
				<Text textStyle="label.sm" color="primary">
					← Back
				</Text>
			</BackButton>

			<VStack gap="2">
				<Heading as="h1" textStyle="primary.lg">
					What kind of business?
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Pick a category and we'll suggest what to set up.
				</Text>
			</VStack>

			<Grid
				gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
				gap="3"
				role="radiogroup"
				aria-label="Business type"
			>
				{BOOKING_VERTICALS.map((v) => (
					<VerticalButton
						key={v.id}
						type="button"
						onClick={() => setSelectedId(v.id)}
						selected={selectedId === v.id}
						role="radio"
						aria-checked={selectedId === v.id}
					>
						<Text textStyle="label.md" color={selectedId === v.id ? 'primary' : 'onSurface'}>
							{v.label}
						</Text>
					</VerticalButton>
				))}
			</Grid>

			<VStack gap="1.5" alignItems="stretch">
				<styled.label htmlFor="doora-business-name">
					<Text textStyle="label.sm" color="onSurfaceVariant">
						Business name
					</Text>
				</styled.label>
				<Input
					id="doora-business-name"
					type="text"
					value={businessName}
					onChange={(e) => setBusinessName(e.target.value)}
					placeholder="e.g. Studio Mia"
				/>
			</VStack>

			<VStack gap="1.5" alignItems="stretch">
				<styled.label htmlFor="doora-website-url">
					<Text textStyle="label.sm" color="onSurfaceVariant">
						Got a website? We'll read it for you
					</Text>
				</styled.label>
				<Input
					id="doora-website-url"
					type="url"
					value={websiteUrl}
					onChange={(e) => setWebsiteUrl(e.target.value)}
					placeholder="https://your-business.com"
				/>
			</VStack>

			<Button
				type="button"
				variant="primary"
				size="lg"
				onClick={handleSubmit}
				disabled={!selectedId}
			>
				Continue →
			</Button>
		</VStack>
	)
}
