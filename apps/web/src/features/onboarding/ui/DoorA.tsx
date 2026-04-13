'use client'

import { Grid, VStack } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import { BOOKING_VERTICALS } from '@/entities/booking-verticals'
import { Heading, Text } from '@/shared/ui'

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
					What kind of business?
				</Heading>
				<Text as="p" textStyle="body.md" color="onSurfaceVariant">
					Pick a category and we'll suggest what to set up.
				</Text>
			</VStack>

			<Grid gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap="3">
				{BOOKING_VERTICALS.map((v) => (
					<button
						key={v.id}
						type="button"
						onClick={() => setSelectedId(v.id)}
						aria-pressed={selectedId === v.id}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							padding: '16px 12px',
							border:
								selectedId === v.id
									? '2px solid var(--colors-primary)'
									: '1px solid var(--colors-outline-variant)',
							borderRadius: 10,
							background:
								selectedId === v.id
									? 'var(--colors-primary-a5)'
									: 'var(--colors-surface-container-lowest)',
							cursor: 'pointer',
							minHeight: 44,
						}}
					>
						<Text textStyle="label.md" color={selectedId === v.id ? 'primary' : 'onSurface'}>
							{v.label}
						</Text>
					</button>
				))}
			</Grid>

			<VStack gap="1.5" alignItems="stretch">
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Business name
				</Text>
				<input
					type="text"
					value={businessName}
					onChange={(e) => setBusinessName(e.target.value)}
					placeholder="e.g. Studio Mia"
					style={{
						width: '100%',
						padding: '10px 14px',
						border: '1px solid var(--colors-outline-variant)',
						borderRadius: 8,
						fontFamily: 'var(--fonts-body)',
						fontSize: 14,
						background: 'transparent',
					}}
				/>
			</VStack>

			<VStack gap="1.5" alignItems="stretch">
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Got a website? We'll read it for you
				</Text>
				<input
					type="url"
					value={websiteUrl}
					onChange={(e) => setWebsiteUrl(e.target.value)}
					placeholder="https://your-business.com"
					style={{
						width: '100%',
						padding: '10px 14px',
						border: '1px solid var(--colors-outline-variant)',
						borderRadius: 8,
						fontFamily: 'var(--fonts-body)',
						fontSize: 14,
						background: 'transparent',
					}}
				/>
			</VStack>

			<button
				type="button"
				onClick={handleSubmit}
				disabled={!selectedId}
				style={{
					padding: '14px 24px',
					border: 'none',
					borderRadius: 8,
					background: selectedId ? 'var(--colors-primary)' : 'var(--colors-outline-variant)',
					color: 'var(--colors-surface)',
					fontFamily: 'var(--fonts-heading)',
					fontWeight: 600,
					fontSize: 14,
					cursor: selectedId ? 'pointer' : 'not-allowed',
					opacity: selectedId ? 1 : 0.5,
					minHeight: 44,
				}}
			>
				Continue →
			</button>
		</VStack>
	)
}
