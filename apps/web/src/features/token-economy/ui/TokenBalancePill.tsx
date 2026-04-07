'use client'

import { Flex, styled } from '@styled-system/jsx'
import { Coins } from 'lucide-react'

export type TokenBalancePillProps = {
	readonly balance: number
}

export function balanceColor(balance: number): string {
	if (balance > 50) return 'green.600'
	if (balance >= 10) return 'amber.600'
	return 'red.600'
}

export function TokenBalancePill({ balance }: TokenBalancePillProps) {
	return (
		<Flex
			alignItems="center"
			gap={1.5}
			paddingInline={2.5}
			paddingBlock={1}
			borderRadius="full"
			bg="surfaceContainer"
			flexShrink={0}
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
	)
}
