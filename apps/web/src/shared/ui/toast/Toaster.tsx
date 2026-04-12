'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Text } from '../typography'
import { getSnapshot, subscribe, type ToastType, toast } from './toast-store'

const ICONS: Record<ToastType, typeof AlertCircle> = {
	error: AlertCircle,
	success: CheckCircle2,
	warning: AlertTriangle,
	info: Info,
}

const ACCENT: Record<ToastType, string> = {
	error: '#ef4444',
	success: '#22c55e',
	warning: '#f59e0b',
	info: '#3b82f6',
}

export function Toaster() {
	const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

	if (items.length === 0) return null

	return (
		<Box
			position="fixed"
			insetBlockEnd={5}
			insetInlineEnd={5}
			zIndex={9999}
			display="flex"
			flexDirection="column"
			gap={3}
			maxWidth="380px"
			width="full"
		>
			{items.map((item) => {
				const Icon = ICONS[item.type]
				const color = ACCENT[item.type]
				return (
					<Flex
						key={item.id}
						role="alert"
						alignItems="flex-start"
						gap={3}
						paddingBlock="14px"
						paddingInline={4}
						bg="surfaceContainerLowest"
						borderRadius="lg"
						borderInlineStart="4px solid"
						boxShadow="0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)"
						animation="toastSlideIn 0.25s ease-out"
						style={{ borderInlineStartColor: color }}
					>
						<Box flexShrink={0} marginBlockStart="2px">
							<Icon size={18} color={color} />
						</Box>
						<Box flex={1} minWidth={0} display="flex" flexDirection="column" gap={0.5}>
							<Text as="p" textStyle="label.md" color="onSurface">
								{item.title}
							</Text>
							{item.description && (
								<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant">
									{item.description}
								</Text>
							)}
						</Box>
						<styled.button
							type="button"
							aria-label="Dismiss notification"
							onClick={() => toast.dismiss(item.id)}
							flexShrink={0}
							background="none"
							border="none"
							cursor="pointer"
							padding={1}
							color="outline"
							borderRadius="sm"
							_hover={{ color: 'onSurface' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<X size={14} />
						</styled.button>
					</Flex>
				)
			})}
		</Box>
	)
}
