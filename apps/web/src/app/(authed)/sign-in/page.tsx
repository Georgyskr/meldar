import { Box, Flex, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { authenticateSession } from '@/server/identity/authenticate-session'
import { Heading, Text } from '@/shared/ui'
import { decideSignInRedirect } from './decide-redirect'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = {
	title: 'Sign in — Meldar',
	description: 'Sign in to your Meldar workspace.',
	robots: { index: false, follow: false },
}

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string; error?: string }>
}) {
	const auth = await authenticateSession((await cookies()).get('meldar-auth')?.value ?? '')
	const decision = decideSignInRedirect(auth, await searchParams)
	if (decision.kind === 'redirect') redirect(decision.to)

	return (
		<styled.main
			minHeight="100vh"
			bg="surface"
			display="flex"
			alignItems="center"
			justifyContent="center"
			paddingInline={6}
			paddingBlock={12}
		>
			<Box width="100%" maxWidth="420px">
				<Flex direction="column" gap={2} marginBlockEnd={8}>
					<Heading textStyle="primary.lg" as="h1" color="onSurface">
						Welcome back
					</Heading>
					<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
						Sign in to your workspace.
					</Text>
				</Flex>

				{decision.errorMessage ? (
					<Box
						role="alert"
						aria-live="polite"
						bg="surfaceVariant"
						color="onSurface"
						borderRadius="md"
						paddingInline={4}
						paddingBlock={3}
						marginBlockEnd={4}
					>
						<Text as="p" textStyle="secondary.sm">
							{decision.errorMessage}
						</Text>
					</Box>
				) : null}

				<Suspense fallback={null}>
					<SignInForm />
				</Suspense>

				<Text
					as="p"
					textStyle="secondary.sm"
					color="onSurfaceVariant"
					marginBlockStart={6}
					textAlign="center"
				>
					New here?{' '}
					<styled.a
						href="/sign-up"
						textStyle="link.inline"
						color="primary"
						_hover={{ textDecoration: 'underline' }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
							borderRadius: 'sm',
						}}
					>
						Create an account
					</styled.a>
				</Text>
			</Box>
		</styled.main>
	)
}
