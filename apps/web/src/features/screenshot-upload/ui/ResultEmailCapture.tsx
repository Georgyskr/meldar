'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Mail } from 'lucide-react'
import { trackEvent } from '@/features/analytics'
import { useEmailSubscribe } from '@/shared/lib/use-email-subscribe'
import { Text } from '@/shared/ui'

export function ResultEmailCapture({ xrayId }: { xrayId: string }) {
	const { email, setEmail, status, subscribe } = useEmailSubscribe()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const ok = await subscribe({ xrayId })
		if (ok) trackEvent({ name: 'email_captured', source: 'xray_result' })
	}

	if (status === 'success') {
		return (
			<Box
				width="100%"
				maxWidth="440px"
				marginInline="auto"
				padding={6}
				borderRadius="20px"
				bg="primary/4"
				border="1px solid"
				borderColor="primary/10"
				textAlign="center"
				style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
			>
				<VStack gap={2}>
					<Box
						width="40px"
						height="40px"
						borderRadius="full"
						bg="primary/10"
						display="flex"
						alignItems="center"
						justifyContent="center"
						marginInline="auto"
					>
						<Text textStyle="primary.sm" color="primary">
							&#10003;
						</Text>
					</Box>
					<Text as="p" textStyle="secondary.sm" color="onSurface">
						You&apos;re in.
					</Text>
					<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
						We&apos;ll send you weekly tips to take back your time.
					</Text>
				</VStack>
			</Box>
		)
	}

	return (
		<Box
			width="100%"
			maxWidth="440px"
			marginInline="auto"
			padding={6}
			borderRadius="20px"
			bg="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant/15"
			boxShadow="0 2px 12px rgba(0, 0, 0, 0.03)"
		>
			<VStack gap={4} alignItems="stretch">
				<Flex gap={3} alignItems="center">
					<Box
						width="36px"
						height="36px"
						borderRadius="10px"
						bg="primary/6"
						display="flex"
						alignItems="center"
						justifyContent="center"
						flexShrink={0}
					>
						<Mail size={16} color="#623153" strokeWidth={1.5} />
					</Box>
					<VStack gap={0} alignItems="flex-start">
						<Text as="p" textStyle="secondary.sm" color="onSurface">
							Save your X-Ray
						</Text>
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant/70">
							Get weekly tips to cut your screen time
						</Text>
					</VStack>
				</Flex>

				<styled.form onSubmit={handleSubmit} width="100%">
					<Flex gap={2} flexDir={{ base: 'column', sm: 'row' }}>
						<styled.input
							type="email"
							required
							aria-label="Your email address"
							placeholder="you@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							flex={1}
							paddingInline={4}
							paddingBlock={3}
							bg="surface"
							border="1.5px solid"
							borderColor="outlineVariant/20"
							borderRadius="12px"
							fontSize="sm"
							color="onSurface"
							outline="none"
							transition="border-color 0.2s ease"
							_focus={{ borderColor: 'primary' }}
							_placeholder={{ color: 'onSurface/35' }}
						/>
						<styled.button
							type="submit"
							disabled={status === 'loading'}
							paddingInline={5}
							paddingBlock={3}
							background="linear-gradient(135deg, #623153 0%, #874a72 100%)"
							color="white"
							fontFamily="heading"
							fontWeight="700"
							fontSize="sm"
							borderRadius="12px"
							border="none"
							cursor="pointer"
							whiteSpace="nowrap"
							transition="all 0.2s ease"
							boxShadow="0 2px 8px rgba(98, 49, 83, 0.2)"
							_hover={{ opacity: 0.9, boxShadow: '0 4px 12px rgba(98, 49, 83, 0.3)' }}
							_disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
						>
							{status === 'loading' ? 'Saving\u2026' : 'Save my X-Ray'}
						</styled.button>
					</Flex>
					{status === 'error' && (
						<Text as="p" textStyle="secondary.sm" color="red.500" marginBlockStart={2}>
							Something went wrong. Try again.
						</Text>
					)}
				</styled.form>
			</VStack>
		</Box>
	)
}
