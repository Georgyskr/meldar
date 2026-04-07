'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'
import { submitSignUp } from './sign-up-submit'

type Status = 'idle' | 'submitting'

export function SignUpForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const safeNext = sanitizeNextParam(searchParams.get('next'))
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
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
				const result = await submitSignUp({
					email,
					password,
					name: name.trim() === '' ? undefined : name,
				})

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
		[email, password, name, router, safeNext],
	)

	const busy = status !== 'idle'

	return (
		<styled.form onSubmit={handleSubmit} noValidate>
			<Flex direction="column" gap={4}>
				<Box>
					<styled.label
						htmlFor="signup-email"
						display="block"
						textStyle="body.sm"
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
						textStyle="body.sm"
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
					<styled.span textStyle="body.xs" color="onSurfaceVariant/70" marginBlockStart={1}>
						At least 8 characters.
					</styled.span>
				</Box>

				<Box>
					<styled.label
						htmlFor="signup-name"
						display="block"
						textStyle="body.sm"
						fontWeight="500"
						color="onSurface"
						marginBlockEnd={2}
					>
						Name <styled.span color="onSurfaceVariant/60">(optional)</styled.span>
					</styled.label>
					<styled.input
						id="signup-name"
						type="text"
						autoComplete="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
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
				</Box>

				{error && (
					<styled.span
						role="alert"
						textStyle="body.sm"
						color="red.500"
						paddingInline={3}
						paddingBlock={2}
						bg="surfaceContainerHigh"
						borderRadius="md"
					>
						{error}
					</styled.span>
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
					{busy ? 'Creating account…' : 'Create account'}
				</styled.button>
			</Flex>
		</styled.form>
	)
}
