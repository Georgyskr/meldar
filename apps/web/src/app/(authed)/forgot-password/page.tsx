import { Box, Flex, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { verifyToken } from '@/server/identity/jwt'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
	title: 'Forgot password — Meldar',
	description: 'Reset your Meldar account password.',
	robots: { index: false, follow: false },
}

export default async function ForgotPasswordPage() {
	const session = verifyToken((await cookies()).get('meldar-auth')?.value ?? '')
	if (session) redirect('/workspace')
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
						Forgot your password?
					</styled.h1>
					<styled.p textStyle="body.base" color="onSurfaceVariant">
						Enter your email and we'll send a reset link.
					</styled.p>
				</Flex>

				<Suspense fallback={null}>
					<ForgotPasswordForm />
				</Suspense>

				<styled.p
					textStyle="body.sm"
					color="onSurfaceVariant"
					marginBlockStart={6}
					textAlign="center"
				>
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
						Back to sign in
					</styled.a>
				</styled.p>
			</Box>
		</styled.main>
	)
}
