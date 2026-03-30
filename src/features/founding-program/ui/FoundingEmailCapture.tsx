'use client'

import { Flex, styled, VStack } from '@styled-system/jsx'
import { Check } from 'lucide-react'
import { useState } from 'react'

export function FoundingEmailCapture() {
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
				body: JSON.stringify({ email, founding: true }),
			})
			if (!res.ok) throw new Error()
			setStatus('success')
		} catch {
			setStatus('error')
		}
	}

	if (status === 'success') {
		return (
			<Flex alignItems="center" gap={3} paddingBlock={4}>
				<Check size={20} color="#623153" />
				<styled.p textStyle="body.base" fontWeight="500" color="onSurface">
					You&apos;re in! Check your email.
				</styled.p>
			</Flex>
		)
	}

	return (
		<styled.form onSubmit={handleSubmit} width="100%" maxWidth="480px">
			<VStack gap={3} alignItems="stretch">
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
						bg="surfaceContainerLowest"
						border="1px solid"
						borderColor="outlineVariant"
						borderRadius="md"
						fontFamily="body"
						fontSize="md"
						color="onSurface"
						outline="none"
						_focus={{ borderColor: 'primary' }}
						_placeholder={{ color: 'onSurface/40' }}
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
						whiteSpace="nowrap"
						_hover={{ opacity: 0.9 }}
						_disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
					>
						{status === 'loading' ? 'Joining...' : 'Claim your spot'}
					</styled.button>
				</Flex>
				<VStack gap={1} alignItems="flex-start">
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						<Check size={12} style={{ display: 'inline', marginRight: 4 }} />
						Free Time Audit (EUR 29 value)
					</styled.span>
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						<Check size={12} style={{ display: 'inline', marginRight: 4 }} />
						Weekly automation playbook
					</styled.span>
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						<Check size={12} style={{ display: 'inline', marginRight: 4 }} />
						Founding pricing locked forever
					</styled.span>
				</VStack>
				{status === 'error' && (
					<styled.span textStyle="body.sm" color="red.500">
						Something went wrong. Try again.
					</styled.span>
				)}
			</VStack>
		</styled.form>
	)
}
