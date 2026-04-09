'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'
import { Text } from '@/shared/ui'
import { GoogleButton, OrDivider } from '@/shared/ui/google-auth'
import { submitSignUp } from './sign-up-submit'

type Status = 'idle' | 'submitting'

export function SignUpForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const safeNext = sanitizeNextParam(searchParams.get('next'))
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
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
				const result = await submitSignUp({ email, password })

				if (!result.ok) {
					setError(result.message)
					setStatus('idle')
					return
				}

				router.push(safeNext)
			} finally {
				inFlight.current = false
			}
		},
		[email, password, router, safeNext],
	)

	const busy = status !== 'idle'

	return (
		<Flex direction="column" gap={5}>
			<GoogleButton />

			<OrDivider />

			<styled.form onSubmit={handleSubmit} noValidate>
				<Flex direction="column" gap={4}>
					<Box>
						<styled.label
							htmlFor="signup-email"
							display="block"
							textStyle="secondary.sm"
							fontWeight="500"
							color="onSurface"
							marginBlockEnd={2}
						>
							Email
						</styled.label>
						<styled.input
							id="signup-email"
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
							_placeholder={{ color: 'onSurface/40' }}
						/>
					</Box>

					<Box>
						<styled.label
							htmlFor="signup-password"
							display="block"
							textStyle="secondary.sm"
							fontWeight="500"
							color="onSurface"
							marginBlockEnd={2}
						>
							Password
						</styled.label>
						<styled.input
							id="signup-password"
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
					</Box>

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
						{busy ? 'Creating account...' : 'Create account'}
					</styled.button>
				</Flex>
			</styled.form>
		</Flex>
	)
}
