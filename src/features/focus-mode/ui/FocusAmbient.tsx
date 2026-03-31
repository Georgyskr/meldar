'use client'

import { Box } from '@styled-system/jsx'
import { useFocusMode } from '../lib/use-focus-mode'

export function FocusAmbient() {
	const { focusMode } = useFocusMode()

	if (!focusMode) return null

	return (
		<Box
			position="absolute"
			inset={0}
			overflow="hidden"
			pointerEvents="none"
			zIndex={0}
			borderRadius="inherit"
		>
			{/* Blob 1 — soft mauve */}
			<Box
				position="absolute"
				top="-20%"
				left="-10%"
				width="60%"
				height="60%"
				borderRadius="full"
				background="radial-gradient(circle, rgba(98,49,83,0.08) 0%, transparent 70%)"
				style={{ animation: 'focusDrift1 35s ease-in-out infinite' }}
			/>
			{/* Blob 2 — warm peach */}
			<Box
				position="absolute"
				bottom="-15%"
				right="-10%"
				width="50%"
				height="50%"
				borderRadius="full"
				background="radial-gradient(circle, rgba(255,184,118,0.06) 0%, transparent 70%)"
				style={{ animation: 'focusDrift2 40s ease-in-out infinite' }}
			/>
			{/* Blob 3 — faint blend */}
			<Box
				position="absolute"
				top="30%"
				right="20%"
				width="40%"
				height="40%"
				borderRadius="full"
				background="radial-gradient(circle, rgba(98,49,83,0.05) 0%, transparent 70%)"
				style={{ animation: 'focusDrift1 30s ease-in-out infinite reverse' }}
			/>
		</Box>
	)
}
