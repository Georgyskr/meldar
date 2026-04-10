'use client'

import type { ResolvedWishes } from '@meldar/orchestrator'
import { css } from '@styled-system/css'
import { Box, Flex, VStack } from '@styled-system/jsx'
import { Heading, Text } from '@/shared/ui'
import { gradientButton, outlineButton } from './glass-styles'

const glassCard = css({
	background: 'rgba(250, 249, 246, 0.7)',
	backdropFilter: 'blur(20px) saturate(1.2)',
	border: '1px solid',
	borderColor: 'outlineVariant/15',
	borderRadius: 'xl',
	boxShadow: '0 2px 12px rgba(98,49,83,0.08)',
	paddingBlock: '6',
	paddingInline: '6',
})

export function ProposalCard({
	wishes,
	onApprove,
	onEdit,
	loading,
}: {
	readonly wishes: ResolvedWishes
	readonly onApprove: () => void
	readonly onEdit?: () => void
	readonly loading?: boolean
}) {
	return (
		<Box className={glassCard}>
			<VStack gap="4" alignItems="stretch">
				<Heading as="h3" textStyle="primary.md" color="onSurface">
					{wishes.appType}
				</Heading>

				<VStack gap="2" alignItems="stretch">
					<ProposalRow label="Style" value={wishes.style} />
					<ProposalRow label="Palette" value={wishes.palette} />
					<ProposalRow label="Sections" value={wishes.sections.join(' · ')} />
					<ProposalRow label="Tone" value={wishes.tone} />
				</VStack>

				<Flex gap="3" paddingBlockStart="2">
					<button type="button" className={gradientButton} onClick={onApprove} disabled={loading}>
						{loading ? 'Setting up...' : 'Looks good →'}
					</button>
					{onEdit && (
						<button type="button" className={outlineButton} onClick={onEdit}>
							Edit
						</button>
					)}
				</Flex>
			</VStack>
		</Box>
	)
}

function ProposalRow({ label, value }: { readonly label: string; readonly value: string }) {
	return (
		<Flex gap="3" alignItems="baseline">
			<Text textStyle="label.sm" color="onSurfaceVariant" flexShrink={0} minWidth="70px">
				{label}
			</Text>
			<Text textStyle="secondary.sm" color="onSurface">
				{value}
			</Text>
		</Flex>
	)
}
