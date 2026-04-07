'use client'

import { styled } from '@styled-system/jsx'
import { useCallback, useRef, useState } from 'react'
import { performSignOut } from './sign-out'

type Status = 'idle' | 'signing-out'

export function SignOutButton() {
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)
	const inFlight = useRef(false)

	const handleClick = useCallback(async () => {
		if (inFlight.current) return
		inFlight.current = true
		setStatus('signing-out')
		setError(null)
		try {
			const result = await performSignOut()
			if (!result.ok) {
				setError(result.message)
				setStatus('idle')
				return
			}
			window.location.href = '/sign-in'
		} finally {
			inFlight.current = false
		}
	}, [])

	const busy = status !== 'idle'

	return (
		<>
			<styled.button
				type="button"
				onClick={() => handleClick()}
				disabled={busy}
				paddingInline={4}
				paddingBlock={2}
				fontSize="sm"
				fontWeight="500"
				fontFamily="body"
				bg="transparent"
				color="onSurfaceVariant"
				border="1px solid"
				borderColor="outlineVariant"
				borderRadius="md"
				cursor={busy ? 'wait' : 'pointer'}
				opacity={busy ? 0.6 : 1}
				transition="all 0.2s ease"
				_hover={{
					bg: busy ? 'transparent' : 'surfaceContainerHigh',
					color: 'onSurface',
				}}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				{busy ? 'Signing out…' : 'Sign out'}
			</styled.button>
			{error && (
				<styled.span role="alert" textStyle="body.xs" color="red.500" marginInlineStart={3}>
					{error}
				</styled.span>
			)}
		</>
	)
}
