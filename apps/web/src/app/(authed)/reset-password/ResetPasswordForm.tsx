'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Text, toast } from '@/shared/ui'

type Status = 'idle' | 'submitting'

export function ResetPasswordForm({ token }: { token: string }) {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)
	const inFlight = useRef(false)

	const handleSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			if (inFlight.current) return

			if (password.length < 8) {
				setError('Password must be at least 8 characters.')
				return
			}

			if (password !== confirm) {
				setError('Passwords do not match.')
				return
			}

			inFlight.current = true
			setStatus('submitting')
			setError(null)

			try {
				const res = await fetch('/api/auth/reset-password', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token, password }),
				})

				if (res.status === 401) {
					setError('This reset link is invalid or expired.')
					setStatus('idle')
					return
				}

				if (!res.ok) {
					setError('Something went wrong. Please try again.')
					setStatus('idle')
					return
				}

				toast.success('Password reset', 'Sign in with your new password')
				router.push('/sign-in')
			} catch {
				setError('Network error. Please try again.')
				setStatus('idle')
			} finally {
				inFlight.current = false
			}
		},
		[password, confirm, token, router],
	)

	const busy = status !== 'idle'

	return (
		<styled.form onSubmit={handleSubmit} noValidate>
			<Flex direction="column" gap={4}>
				<styled.div>
					<styled.label
						htmlFor="reset-password"
						display="block"
						textStyle="secondary.sm"
						fontWeight="500"
						color="onSurface"
						marginBlockEnd={2}
					>
						New password
					</styled.label>
					<styled.input
						id="reset-password"
						type="password"
						required
						minLength={8}
						autoComplete="new-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
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
					<Text textStyle="secondary.xs" color="onSurfaceVariant/70" marginBlockStart={1}>
						At least 8 characters.
					</Text>
				</styled.div>

				<styled.div>
					<styled.label
						htmlFor="reset-confirm"
						display="block"
						textStyle="secondary.sm"
						fontWeight="500"
						color="onSurface"
						marginBlockEnd={2}
					>
						Confirm password
					</styled.label>
					<styled.input
						id="reset-confirm"
						type="password"
						required
						autoComplete="new-password"
						value={confirm}
						onChange={(event) => setConfirm(event.target.value)}
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
						{error.includes('invalid or expired') && (
							<>
								{' '}
								<styled.a
									href="/forgot-password"
									color="primary"
									fontWeight="600"
									textDecoration="none"
									_hover={{ textDecoration: 'underline' }}
								>
									Request a new link
								</styled.a>
							</>
						)}
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
					{busy ? 'Resetting...' : 'Reset password'}
				</styled.button>
			</Flex>
		</styled.form>
	)
}
