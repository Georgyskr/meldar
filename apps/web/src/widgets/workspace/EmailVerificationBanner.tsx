'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui'

type BannerStatus = 'visible' | 'resending' | 'sent' | 'dismissed'

export function EmailVerificationBanner({ email, verified }: { email: string; verified: boolean }) {
	const [status, setStatus] = useState<BannerStatus>('visible')
	const inFlight = useRef(false)
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(timerRef.current), [])

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
				timerRef.current = setTimeout(() => setStatus('visible'), 3000)
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
			paddingInline={5}
			paddingBlock={3}
			bg="amber.50"
			border="1px solid"
			borderColor="amber.200"
			marginBlockEnd={6}
			flexWrap="wrap"
		>
			<Text as="p" textStyle="secondary.sm" color="amber.900" flex="1" minWidth="0">
				Verify your email to keep your account safe. We sent a link to{' '}
				<Text textStyle="primary.xs" as="strong">
					{email}
				</Text>
				.
			</Text>

			<Flex alignItems="center" gap={3} flexShrink={0}>
				{status === 'sent' ? (
					<Text textStyle="secondary.sm" color="green.700">
						Sent!
					</Text>
				) : (
					<styled.button
						type="button"
						onClick={() => handleResend()}
						disabled={status === 'resending'}
						color="amber.900"
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
						}}
					>
						<Text textStyle="primary.xs" color="amber.900">
							{status === 'resending' ? 'Sending...' : 'Resend email'}
						</Text>
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
					paddingInline={1}
					paddingBlock={1}
					_hover={{ color: 'amber.600' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'amber.500',
						outlineOffset: '2px',
					}}
				>
					&times;
				</styled.button>
			</Flex>
		</Flex>
	)
}
