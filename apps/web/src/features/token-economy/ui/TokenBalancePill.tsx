'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { Coins } from 'lucide-react'
import { useState } from 'react'

export type TokenBalancePillProps = {
	readonly balance: number
}

export function balanceColor(balance: number): string {
	if (balance > 50) return 'green.600'
	if (balance >= 10) return 'amber.600'
	return 'red.600'
}

export function TokenBalancePill({ balance }: TokenBalancePillProps) {
	const [showTooltip, setShowTooltip] = useState(false)

	return (
		<Box position="relative" display="inline-flex">
			<Flex
				alignItems="center"
				gap={1.5}
				paddingInline={2.5}
				paddingBlock={1}
				borderRadius="full"
				bg="surfaceContainer"
				flexShrink={0}
				cursor="default"
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				onFocus={() => setShowTooltip(true)}
				onBlur={() => setShowTooltip(false)}
				tabIndex={0}
				role="status"
				aria-label={`${balance} tokens remaining`}
			>
				<Coins size={14} aria-hidden />
				<styled.span
					textStyle="body.xs"
					fontWeight="600"
					color={balanceColor(balance)}
					whiteSpace="nowrap"
				>
					{balance} tokens
				</styled.span>
			</Flex>

			{showTooltip && (
				<Box
					position="absolute"
					insetBlockStart="100%"
					insetInlineStart="50%"
					transform="translateX(-50%)"
					marginBlockStart={2}
					paddingBlock={2.5}
					paddingInline={3.5}
					borderRadius="md"
					bg="onSurface"
					color="surface"
					width="240px"
					zIndex={60}
					boxShadow="lg"
					pointerEvents="none"
				>
					<styled.p textStyle="body.xs" lineHeight="1.5">
						Tokens are used when Meldar builds features for you. You have{' '}
						<styled.span fontWeight="700">{balance} tokens</styled.span>. You earn 15 free tokens
						daily.
					</styled.p>
				</Box>
			)}
		</Box>
	)
}
