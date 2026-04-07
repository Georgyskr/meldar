import { Box, Flex, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { verifyToken } from '@/server/identity/jwt'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'
import { SignInForm } from './SignInForm'

export const metadata: Metadata = {
	title: 'Sign in — Meldar',
	description: 'Sign in to your Meldar workspace.',
	robots: { index: false, follow: false },
}

export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>
}) {
	const session = verifyToken((await cookies()).get('meldar-auth')?.value ?? '')
	const params = await searchParams
	if (session) redirect(sanitizeNextParam(params.next, { mustStartWith: '/workspace' }))
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
					<styled.h1
						fontFamily="heading"
						fontSize="3xl"
						fontWeight="700"
						letterSpacing="-0.03em"
						color="onSurface"
					>
						Welcome back
					</styled.h1>
					<styled.p textStyle="body.base" color="onSurfaceVariant">
						Sign in to your workspace.
					</styled.p>
				</Flex>

				<Suspense fallback={null}>
					<SignInForm />
				</Suspense>

				<styled.p
					textStyle="body.sm"
					color="onSurfaceVariant"
					marginBlockStart={6}
					textAlign="center"
				>
					New here?{' '}
					<styled.a
						href="/sign-up"
						color="primary"
						fontWeight="600"
						textDecoration="none"
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
				</styled.p>
			</Box>
		</styled.main>
	)
}
