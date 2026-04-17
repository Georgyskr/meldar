'use client'

import { Box, Flex, VStack } from '@styled-system/jsx'
import { Button, Heading, Text } from '@/shared/ui'
import type { ProposalData } from '../model/types'

type Props = {
	readonly proposal: ProposalData
	readonly submitting: boolean
	readonly error: string | null
	readonly onConfirm: () => void
	readonly onGoBack: () => void
	readonly sourceName?: string
}

export function ProposalPreview({
	proposal,
	submitting,
	error,
	onConfirm,
	onGoBack,
	sourceName,
}: Props) {
	const dayLabel =
		proposal.hours.days.length === 7
			? 'Every day'
			: proposal.hours.days.length === 5
				? 'Weekdays'
				: `${proposal.hours.days.length} days/week`

	return (
		<VStack gap="6" alignItems="stretch" paddingBlock="8" paddingInline="6">
			<VStack gap="2">
				<Text textStyle="label.sm" color="primary">
					{proposal.verticalLabel}
				</Text>
				<Heading as="h1" textStyle="primary.lg">
					{sourceName
						? `A copy of ${sourceName}, ready to tweak`
						: "Here's what we've put together for you"}
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Ready in about 30 seconds. Change anything first, or go.
				</Text>
			</VStack>

			<Box border="1px solid" borderColor="outlineVariant/30" borderRadius="lg" overflow="hidden">
				<Box
					paddingBlock="6"
					paddingInline="5"
					background="primary/5"
					borderBlockEnd="1px solid"
					borderColor="outlineVariant/30"
					textAlign="center"
				>
					<Heading as="h2" textStyle="primary.md" color="primary">
						{proposal.businessName}
					</Heading>
				</Box>

				<VStack gap="0" alignItems="stretch" paddingInline="5" paddingBlock="4">
					{proposal.services.map((svc) => (
						<Flex
							key={svc.name}
							justifyContent="space-between"
							alignItems="center"
							paddingBlock="3"
							borderBlockEnd="1px solid"
							borderColor="outlineVariant/15"
						>
							<VStack gap="0.5" alignItems="flex-start">
								<Text textStyle="label.md" color="onSurface">
									{svc.name}
								</Text>
								<Text textStyle="secondary.xs" color="onSurfaceVariant">
									{svc.durationMinutes} min
								</Text>
							</VStack>
						</Flex>
					))}
				</VStack>

				<Flex gap="2" alignItems="center" paddingInline="5" paddingBlock="3">
					<Text textStyle="secondary.xs" color="onSurfaceVariant">
						{dayLabel}, {proposal.hours.start}–{proposal.hours.end}
					</Text>
				</Flex>
			</Box>

			{error && (
				<Box
					role="alert"
					paddingBlock="3"
					paddingInline="4"
					background="error/10"
					borderRadius="md"
				>
					<Text textStyle="secondary.sm" color="error">
						{error}
					</Text>
				</Box>
			)}

			<Flex gap="3">
				<Button
					type="button"
					variant="solid"
					size="lg"
					onClick={onConfirm}
					disabled={submitting}
					aria-busy={submitting}
					flex={1}
				>
					{submitting ? 'Setting up\u2026' : 'Let\u2019s go \u2192'}
				</Button>
				<Button type="button" variant="outline" size="lg" onClick={onGoBack} disabled={submitting}>
					Change things
				</Button>
			</Flex>
		</VStack>
	)
}
