'use client'

import { styled } from '@styled-system/jsx'
import { useState } from 'react'
import { trackEvent } from '@/features/analytics'
import type { ProductSlug } from '@/shared/config/stripe'

type PurchaseButtonProps = {
	product: ProductSlug
	email?: string
	xrayId?: string
	label: string
	variant?: 'primary' | 'secondary'
}

export function PurchaseButton({
	product,
	email,
	xrayId,
	label,
	variant = 'primary',
}: PurchaseButtonProps) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	async function handleClick() {
		setLoading(true)
		setError('')
		trackEvent({ name: 'checkout_initiated', product })
		try {
			const res = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ product, email, xrayId }),
			})
			const data = await res.json()

			if (data.url) {
				window.location.href = data.url
				return
			}

			setError('Something went wrong. Please try again.')
			setLoading(false)
		} catch {
			setError('Connection failed. Please try again.')
			setLoading(false)
		}
	}

	const isPrimary = variant === 'primary'

	return (
		<>
			<styled.button
				onClick={handleClick}
				disabled={loading}
				width="100%"
				paddingBlock={3}
				paddingInline={6}
				background={isPrimary ? 'linear-gradient(135deg, #623153 0%, #FFB876 100%)' : 'transparent'}
				color={isPrimary ? 'white' : 'onSurface'}
				border={isPrimary ? 'none' : '1px solid'}
				borderColor="outlineVariant"
				borderRadius="md"
				fontFamily="heading"
				fontWeight="700"
				fontSize="sm"
				cursor="pointer"
				transition="opacity 0.2s ease"
				_hover={{ opacity: 0.9 }}
				_disabled={{ opacity: 0.6, cursor: 'wait' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				{loading ? 'Redirecting...' : label}
			</styled.button>
			{error && (
				<styled.p textStyle="body.sm" color="red.500" textAlign="center" marginBlockStart={2}>
					{error}
				</styled.p>
			)}
		</>
	)
}
