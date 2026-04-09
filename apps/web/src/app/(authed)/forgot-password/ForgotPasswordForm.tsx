'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useCallback, useRef, useState } from 'react'
import { Text } from '@/shared/ui'

type Status = 'idle' | 'submitting' | 'sent'

export function ForgotPasswordForm() {
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)
	const inFlight = useRef(false)

	const handleSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			if (inFlight.current) return
			inFlight.current = true
			setStatus('submitting')
			setError(null)

			try {
				const res = await fetch('/api/auth/forgot-password', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email }),
				})

				if (res.status === 429) {
					setError('Too many requests. Try again in a few minutes.')
					setStatus('idle')
					return
				}

				if (!res.ok) {
					setError('Something went wrong. Please try again.')
					setStatus('idle')
					return
				}

				setStatus('sent')
			} catch {
				setError('Network error. Please try again.')
				setStatus('idle')
			} finally {
				inFlight.current = false
			}
		},
		[email],
	)

	if (status === 'sent') {
		return (
			<styled.div
				role="status"
				paddingInline={4}
				paddingBlock={4}
				bg="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant"
				borderRadius="md"
			>
				<Text as="p" textStyle="secondary.md" color="onSurface">
					If an account exists for that email, we sent a reset link. Check your inbox.
				</Text>
			</styled.div>
		)
	}

	const busy = status !== 'idle'

	return (
		<styled.form onSubmit={handleSubmit} noValidate>
			<Flex direction="column" gap={4}>
				<styled.div>
					<styled.label
						htmlFor="forgot-email"
						display="block"
						textStyle="secondary.sm"
						fontWeight="500"
						color="onSurface"
						marginBlockEnd={2}
					>
						Email
					</styled.label>
					<styled.input
						id="forgot-email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						width="100%"
						paddingInline={4}
						paddingBlock={3}
						bg="surfaceContainerLowest"
						border="1px solid"
						borderColor="outlineVariant"
						borderRadius="md"
						fontFamily="body"
						fontSize="md"
						color="onSurface"
						outline="none"
						transition="border-color 0.2s ease"
						_focus={{ borderColor: 'primary' }}
					/>
				</styled.div>

				{error && (
					<Text
						role="alert"
						textStyle="secondary.sm"
						color="red.500"
						paddingInline={3}
						paddingBlock={2}
						bg="surfaceContainerHigh"
						borderRadius="md"
					>
						{error}
					</Text>
				)}

				<styled.button
					type="submit"
					disabled={busy}
					marginBlockStart={2}
					paddingInline={6}
					paddingBlock={3}
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					borderRadius="md"
					border="none"
					cursor={busy ? 'wait' : 'pointer'}
					opacity={busy ? 0.6 : 1}
					transition="opacity 0.2s ease"
					_hover={{ opacity: busy ? 0.6 : 0.9 }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					{busy ? 'Sending...' : 'Send reset link'}
				</styled.button>
			</Flex>
		</styled.form>
	)
}
