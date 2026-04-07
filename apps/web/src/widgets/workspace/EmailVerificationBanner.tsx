'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useCallback, useRef, useState } from 'react'

type BannerStatus = 'visible' | 'resending' | 'sent' | 'dismissed'

export function EmailVerificationBanner({ email, verified }: { email: string; verified: boolean }) {
	const [status, setStatus] = useState<BannerStatus>('visible')
	const inFlight = useRef(false)

	const handleResend = useCallback(async () => {
		if (inFlight.current) return
		inFlight.current = true
		setStatus('resending')

		try {
			const res = await fetch('/api/auth/resend-verification', {
				method: 'POST',
			})

			if (res.ok) {
				setStatus('sent')
				setTimeout(() => setStatus('visible'), 3000)
			} else {
				setStatus('visible')
			}
		} catch {
			setStatus('visible')
		} finally {
			inFlight.current = false
		}
	}, [])

	const handleDismiss = useCallback(() => {
		setStatus('dismissed')
	}, [])

	if (verified || status === 'dismissed') return null

	return (
		<Flex
			role="status"
			alignItems="center"
			justifyContent="space-between"
			gap={4}
			paddingInline={4}
			paddingBlock={3}
			bg="amber.50"
			border="1px solid"
			borderColor="amber.200"
			borderRadius="md"
			marginBlockEnd={6}
			flexWrap="wrap"
		>
			<styled.p textStyle="body.sm" color="amber.900" flex="1" minWidth="0">
				Verify your email to keep your account safe. We sent a link to{' '}
				<styled.strong fontWeight="600">{email}</styled.strong>.
			</styled.p>

			<Flex alignItems="center" gap={3} flexShrink={0}>
				{status === 'sent' ? (
					<styled.span textStyle="body.sm" color="green.700" fontWeight="600">
						Sent!
					</styled.span>
				) : (
					<styled.button
						type="button"
						onClick={() => handleResend()}
						disabled={status === 'resending'}
						textStyle="body.sm"
						color="amber.900"
						fontWeight="600"
						textDecoration="underline"
						bg="transparent"
						border="none"
						cursor={status === 'resending' ? 'wait' : 'pointer'}
						opacity={status === 'resending' ? 0.6 : 1}
						_hover={{ color: 'amber.700' }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'amber.500',
							outlineOffset: '2px',
							borderRadius: 'sm',
						}}
					>
						{status === 'resending' ? 'Sending...' : 'Resend email'}
					</styled.button>
				)}

				<styled.button
					type="button"
					onClick={() => handleDismiss()}
					aria-label="Dismiss verification banner"
					bg="transparent"
					border="none"
					cursor="pointer"
					color="amber.400"
					fontSize="lg"
					lineHeight="1"
					paddingInline={1}
					paddingBlock={1}
					_hover={{ color: 'amber.600' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'amber.500',
						outlineOffset: '2px',
						borderRadius: 'sm',
					}}
				>
					&times;
				</styled.button>
			</Flex>
		</Flex>
	)
}
