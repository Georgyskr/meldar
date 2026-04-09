'use client'

import { Flex, styled } from '@styled-system/jsx'
import { Ticket, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Text } from '@/shared/ui'

export type TokenNudgeBannerProps = {
	readonly balance: number
	readonly onSeePlans: () => void
}

export function TokenNudgeBanner({ balance, onSeePlans }: TokenNudgeBannerProps) {
	const [dismissed, setDismissed] = useState(false)

	const handleDismiss = useCallback(() => {
		setDismissed(true)
	}, [])

	if (dismissed || balance >= 50) return null

	return (
		<Flex
			alignItems="center"
			justifyContent="space-between"
			gap={3}
			paddingBlock={2.5}
			paddingInline={5}
			bg="amber.50"
			borderBlockEnd="1px solid"
			borderColor="amber.200"
			flexShrink={0}
			role="status"
		>
			<Flex alignItems="center" gap={2} flex="1" minWidth={0}>
				<Ticket size={16} color="#b45309" aria-hidden />
				<Text as="p" textStyle="secondary.xs" color="amber.800">
					You have <Text textStyle="primary.xs">{balance} tokens</Text> left. Get more to keep
					building.
				</Text>
			</Flex>

			<Flex alignItems="center" gap={2} flexShrink={0}>
				<styled.button
					type="button"
					onClick={() => onSeePlans()}
					paddingBlock={1}
					paddingInline={3}
					borderRadius="md"
					background="amber.600"
					color="white"
					textStyle="secondary.xs"
					fontWeight="600"
					cursor="pointer"
					transition="background 0.15s"
					_hover={{ background: 'amber.700' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'amber.600',
						outlineOffset: '2px',
					}}
				>
					See plans
				</styled.button>
				<styled.button
					type="button"
					onClick={() => handleDismiss()}
					padding={1}
					borderRadius="sm"
					color="amber.600"
					cursor="pointer"
					transition="color 0.15s"
					_hover={{ color: 'amber.800' }}
					aria-label="Dismiss"
				>
					<X size={14} />
				</styled.button>
			</Flex>
		</Flex>
	)
}
