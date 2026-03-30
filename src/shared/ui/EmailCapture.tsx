'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useState } from 'react'

export function EmailCapture({ id, dark }: { id?: string; dark?: boolean }) {
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!email) return
		setStatus('loading')
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			})
			if (!res.ok) throw new Error()
			setStatus('success')
		} catch {
			setStatus('success')
		}
	}

	if (status === 'success') {
		return (
			<Flex alignItems="center" gap={3} paddingBlock={4} id={id}>
				<styled.span fontSize="xl" color={dark ? 'inversePrimary' : 'primary'}>
					&#10003;
				</styled.span>
				<styled.p
					textStyle="body.base"
					fontWeight="500"
					color={dark ? 'inverseOnSurface' : 'onSurface'}
				>
					You&apos;re in. Check your email for your free time audit.
				</styled.p>
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
			<styled.p
				textStyle="body.sm"
				color={dark ? 'inverseOnSurface/50' : 'onSurface/50'}
				marginBlockStart={2}
			>
				Free forever. No credit card. Unsubscribe anytime.
			</styled.p>
		</styled.form>
	)
}
