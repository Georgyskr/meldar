import { Box, Flex, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { verifyToken } from '@/server/identity/jwt'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'
import { SignUpForm } from './SignUpForm'

export const metadata: Metadata = {
	title: 'Sign up — Meldar',
	description: 'Create your Meldar account.',
	robots: { index: false, follow: false },
}

export default async function SignUpPage({
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
						Create your account
					</styled.h1>
					<styled.p textStyle="body.base" color="onSurfaceVariant">
						Your AI. Your app. Nobody else's.
					</styled.p>
				</Flex>

				<Suspense fallback={null}>
					<SignUpForm />
				</Suspense>

				<styled.p
					textStyle="body.sm"
					color="onSurfaceVariant"
					marginBlockStart={6}
					textAlign="center"
				>
					Already have an account?{' '}
					<styled.a
						href="/sign-in"
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
						Sign in
					</styled.a>
				</styled.p>
			</Box>
		</styled.main>
	)
}
