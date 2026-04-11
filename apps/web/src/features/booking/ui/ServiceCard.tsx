'use client'

import { Box, Flex, HStack, VStack } from '@styled-system/jsx'
import { Clock } from 'lucide-react'
import { Button, Heading, Text } from '@/shared/ui'

type Props = {
	readonly name: string
	readonly durationMinutes: number
	readonly priceEur: number
	readonly onSelect: () => void
}

function formatDuration(minutes: number): string {
	if (minutes < 60) return `${minutes} min`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatPrice(priceEur: number): string {
	if (priceEur === 0) return 'Free'
	return `€${priceEur}`
}

export function ServiceCard({ name, durationMinutes, priceEur, onSelect }: Props) {
	return (
		<Box
			paddingBlock={5}
			paddingInline={6}
			background="surface"
			border="1px solid"
			borderColor="outlineVariant/30"
			borderRadius="lg"
			transition="border-color 0.15s, box-shadow 0.15s"
			_hover={{
				borderColor: 'primary/40',
				boxShadow: '0 2px 12px rgba(98, 49, 83, 0.08)',
			}}
		>
			<Flex
				direction={{ base: 'column', sm: 'row' }}
				alignItems={{ base: 'stretch', sm: 'center' }}
				gap={4}
			>
				<VStack alignItems="flex-start" gap={1.5} flex={1}>
					<Heading as="h3" textStyle="heading.4" color="onSurface">
						{name}
					</Heading>
					<HStack gap={4}>
						<HStack gap={1.5} alignItems="center">
							<Clock size={14} aria-hidden="true" color="var(--colors-on-surface-variant)" />
							<Text textStyle="body.sm" color="onSurfaceVariant">
								{formatDuration(durationMinutes)}
							</Text>
						</HStack>
						<Text textStyle="label.md" color="onSurface">
							{formatPrice(priceEur)}
						</Text>
					</HStack>
				</VStack>

				<Button type="button" variant="solid" size="md" onClick={onSelect} flexShrink={0}>
					Book now
				</Button>
			</Flex>
		</Box>
	)
}
