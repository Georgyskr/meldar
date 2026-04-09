'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useEmailSubscribe } from '@/shared/lib/use-email-subscribe'
import { Text } from '@/shared/ui'

export function EmailCapture({ id, dark }: { id?: string; dark?: boolean }) {
	const { email, setEmail, status, subscribe } = useEmailSubscribe()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		await subscribe()
	}

	if (status === 'success') {
		return (
			<Flex alignItems="center" gap={3} paddingBlock={4} id={id}>
				<Text textStyle="primary.sm" color={dark ? 'inversePrimary' : 'primary'}>
					&#10003;
				</Text>
				<Text as="p" textStyle="secondary.md" color={dark ? 'inverseOnSurface' : 'onSurface'}>
					You&apos;re in. Check your email for your free time audit.
				</Text>
			</Flex>
		)
	}

	return (
		<styled.form onSubmit={handleSubmit} id={id} width="100%" maxWidth="480px">
			<Flex gap={3} flexDir={{ base: 'column', sm: 'row' }} width="100%">
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
					bg={dark ? 'white/10' : 'surfaceContainerLowest'}
					border="1px solid"
					borderColor={dark ? 'white/25' : 'outlineVariant'}
					borderRadius="md"
					fontFamily="body"
					fontSize="md"
					color={dark ? 'inverseOnSurface' : 'onSurface'}
					outline="none"
					transition="border-color 0.2s ease"
					_focus={{ borderColor: 'primary' }}
					_placeholder={{ color: dark ? 'inverseOnSurface/40' : 'onSurface/40' }}
				/>
				<styled.button
					type="submit"
					disabled={status === 'loading'}
					paddingInline={6}
					paddingBlock={3}
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					fontFamily="heading"
					fontWeight="700"
					fontSize="sm"
					borderRadius="md"
					border="none"
					cursor="pointer"
					transition="opacity 0.2s ease"
					whiteSpace="nowrap"
					_hover={{ opacity: 0.9 }}
					_disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					{status === 'loading' ? 'Sending...' : 'Get your free time audit'}
				</styled.button>
			</Flex>
			{status === 'error' && (
				<Text textStyle="secondary.sm" color="red.500" marginBlockStart={2}>
					Something went wrong. Try again.
				</Text>
			)}
			<Text
				as="p"
				textStyle="secondary.sm"
				color={dark ? 'inverseOnSurface/50' : 'onSurface/50'}
				marginBlockStart={2}
			>
				Free forever. No credit card. Unsubscribe anytime.
			</Text>
		</styled.form>
	)
}
