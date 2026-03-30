'use client'

import { Flex, styled, VStack } from '@styled-system/jsx'
import { useState } from 'react'
import { trackEvent } from '@/features/analytics'

export function ResultEmailCapture({ xrayId }: { xrayId: string }) {
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
				body: JSON.stringify({ email, xrayId }),
			})
			if (!res.ok) throw new Error()
			trackEvent({ name: 'email_captured', source: 'xray_result' })
			setStatus('success')
		} catch {
			setStatus('error')
		}
	}

	if (status === 'success') {
		return (
			<VStack
				gap={2}
				width="100%"
				maxWidth="440px"
				marginInline="auto"
				padding={5}
				borderRadius="xl"
				bg="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/20"
				textAlign="center"
			>
				<styled.span fontSize="xl" color="primary">
					&#10003;
				</styled.span>
				<styled.p textStyle="body.sm" fontWeight="500" color="onSurface">
					Saved! We&apos;ll send you tips to cut your screen time.
				</styled.p>
			</VStack>
		)
	}

	return (
		<VStack
			gap={3}
			width="100%"
			maxWidth="440px"
			marginInline="auto"
			padding={5}
			borderRadius="xl"
			bg="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant/20"
		>
			<styled.p textStyle="body.sm" fontWeight="500" color="onSurface" textAlign="center">
				Save your X-Ray and get weekly tips to take back your time
			</styled.p>
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
						border="1px solid"
						borderColor="outlineVariant"
						borderRadius="md"
						fontSize="sm"
						color="onSurface"
						outline="none"
						_focus={{ borderColor: 'primary' }}
						_placeholder={{ color: 'onSurface/40' }}
					/>
					<styled.button
						type="submit"
						disabled={status === 'loading'}
						paddingInline={5}
						paddingBlock={3}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						fontFamily="heading"
						fontWeight="700"
						fontSize="sm"
						borderRadius="md"
						border="none"
						cursor="pointer"
						whiteSpace="nowrap"
						_hover={{ opacity: 0.9 }}
						_disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
					>
						{status === 'loading' ? 'Saving...' : 'Save my X-Ray'}
					</styled.button>
				</Flex>
				{status === 'error' && (
					<styled.p textStyle="body.sm" color="red.500" marginBlockStart={2}>
						Something went wrong. Try again.
					</styled.p>
				)}
			</styled.form>
		</VStack>
	)
}
