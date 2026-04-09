import { Box, Flex, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { verifyToken } from '@/server/identity/jwt'
import { Heading, Text } from '@/shared/ui'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = {
	title: 'Reset password — Meldar',
	description: 'Set a new password for your Meldar account.',
	robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>
}) {
	const session = verifyToken((await cookies()).get('meldar-auth')?.value ?? '')
	if (session) redirect('/workspace')

	const params = await searchParams

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
						Reset your password
					</Heading>
					<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
						Choose a new password for your account.
					</Text>
				</Flex>

				{params.token ? (
					<Suspense fallback={null}>
						<ResetPasswordForm token={params.token} />
					</Suspense>
				) : (
					<styled.div
						role="alert"
						paddingInline={4}
						paddingBlock={4}
						bg="surfaceContainerHigh"
						borderRadius="md"
					>
						<Text as="p" textStyle="secondary.md" color="red.500">
							This reset link is invalid.{' '}
							<styled.a
								href="/forgot-password"
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
								Request a new one
							</styled.a>
						</Text>
					</styled.div>
				)}

				<Text
					as="p"
					textStyle="secondary.sm"
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
				</Text>
			</Box>
		</styled.main>
	)
}
