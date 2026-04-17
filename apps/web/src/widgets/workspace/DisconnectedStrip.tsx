'use client'

import { Flex, styled } from '@styled-system/jsx'
import { WifiOff } from 'lucide-react'
import { Text } from '@/shared/ui'

type Props = {
	readonly reason: string | null
	readonly onRefresh: () => void
}

export function DisconnectedStrip({ reason, onRefresh }: Props) {
	if (!reason) return null

	return (
		<Flex
			role="status"
			aria-live="polite"
			alignItems="center"
			justifyContent="space-between"
			gap={3}
			paddingBlock={2}
			paddingInline={4}
			background="surfaceContainer"
			borderBottom="1px solid"
			borderColor="outlineVariant/50"
			color="onSurfaceVariant"
			minHeight="44px"
		>
			<Flex alignItems="center" gap={2} minWidth={0} flex={1}>
				<WifiOff size={14} color="currentColor" />
				<Text
					as="span"
					textStyle="secondary.sm"
					color="onSurface"
					overflow="hidden"
					textOverflow="ellipsis"
					whiteSpace="nowrap"
				>
					{reason}
				</Text>
			</Flex>
			<styled.button
				type="button"
				onClick={onRefresh}
				paddingBlock={2}
				paddingInline={3}
				minHeight="44px"
				minWidth="44px"
				background="transparent"
				color="primary"
				border="none"
				cursor="pointer"
				transition="color 0.15s"
				_hover={{ color: 'onSurface', textDecoration: 'underline' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				<Text as="span" textStyle="button.sm" color="inherit">
					Refresh
				</Text>
			</styled.button>
		</Flex>
	)
}
