'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Heading, Text } from '@/shared/ui'

export type PricingDrawerProps = {
	readonly open: boolean
	readonly onClose: () => void
}

type Tier = {
	readonly name: string
	readonly price: string | null
	readonly period: string | null
	readonly badge: string | null
	readonly features: readonly string[]
	readonly cta: string | null
}

const TIERS: readonly Tier[] = [
	{
		name: 'Free',
		price: null,
		period: null,
		badge: "You're here",
		features: [
			'200 tokens on signup',
			'15 tokens daily',
			'Build 2-3 complete apps',
			'All templates included',
		],
		cta: null,
	},
	{
		name: 'Starter',
		price: '\u20ac9.99',
		period: '/mo',
		badge: null,
		features: ['800 tokens/month', 'Priority builds', 'All templates included', 'Email support'],
		cta: 'Upgrade',
	},
	{
		name: 'Pro',
		price: '\u20ac29',
		period: '/mo',
		badge: null,
		features: ['2,000 tokens/month', 'Custom templates', 'Faster models', 'Priority support'],
		cta: 'Upgrade',
	},
]

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function PricingDrawer({ open, onClose }: PricingDrawerProps) {
	const titleId = useId()
	const drawerRef = useRef<HTMLDivElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const previouslyFocusedRef = useRef<HTMLElement | null>(null)
	const [toast, setToast] = useState<string | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(toastTimerRef.current), [])

	useEffect(() => {
		if (!open) return

		previouslyFocusedRef.current = document.activeElement as HTMLElement | null
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		closeButtonRef.current?.focus()

		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
				return
			}
			if (e.key !== 'Tab') return
			const drawer = drawerRef.current
			if (!drawer) return
			const focusables = Array.from(
				drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			).filter((el) => !el.hasAttribute('disabled'))
			if (focusables.length === 0) {
				e.preventDefault()
				return
			}
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const active = document.activeElement as HTMLElement | null
			if (e.shiftKey) {
				if (active === first || !drawer.contains(active)) {
					e.preventDefault()
					last.focus()
				}
			} else if (active === last) {
				e.preventDefault()
				first.focus()
			}
		}

		window.addEventListener('keydown', handleKey)
		return () => {
			window.removeEventListener('keydown', handleKey)
			document.body.style.overflow = previousOverflow
			previouslyFocusedRef.current?.focus?.()
		}
	}, [open, onClose])

	const handleUpgrade = useCallback(() => {
		setToast("Coming soon \u2014 we'll notify you when paid plans are available.")
		clearTimeout(toastTimerRef.current)
		toastTimerRef.current = setTimeout(() => {
			setToast(null)
		}, 4000)
	}, [])

	if (!open) return null

	return (
		<Box position="fixed" inset={0} zIndex={50}>
			<styled.button
				type="button"
				onClick={() => onClose()}
				position="absolute"
				inset={0}
				bg="black/40"
				border="none"
				cursor="pointer"
				aria-hidden="true"
				tabIndex={-1}
			/>
			<Box
				ref={drawerRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				position="absolute"
				insetInlineEnd={0}
				insetBlockStart={0}
				insetBlockEnd={0}
				width={{ base: '100%', md: '440px' }}
				bg="surface"
				borderInlineStart="1px solid"
				borderColor="outlineVariant/40"
				display="flex"
				flexDirection="column"
				overflowY="auto"
			>
				<Flex
					justifyContent="space-between"
					alignItems="center"
					paddingBlock={5}
					paddingInline={6}
					borderBlockEnd="1px solid"
					borderColor="outlineVariant/20"
					flexShrink={0}
				>
					<Heading id={titleId} textStyle="primary.xs" color="onSurface">
						Meldar Plans
					</Heading>
					<styled.button
						ref={closeButtonRef}
						type="button"
						onClick={() => onClose()}
						padding={1}
						borderRadius="sm"
						color="onSurfaceVariant"
						cursor="pointer"
						transition="color 0.15s"
						_hover={{ color: 'onSurface' }}
						aria-label="Close pricing"
					>
						<X size={18} />
					</styled.button>
				</Flex>

				<VStack alignItems="stretch" gap={4} padding={6} flex="1">
					{TIERS.map((tier) => (
						<Box
							key={tier.name}
							paddingBlock={4}
							paddingInline={5}
							borderRadius="lg"
							border="1px solid"
							borderColor={tier.badge ? 'primary/30' : 'outlineVariant/30'}
							bg={tier.badge ? 'primary/5' : 'surfaceContainerLowest'}
						>
							<Flex justifyContent="space-between" alignItems="center" marginBlockEnd={3}>
								<Flex alignItems="baseline" gap={1.5}>
									<Text textStyle="secondary.lg" color="onSurface">
										{tier.name}
									</Text>
									{tier.price && (
										<Flex alignItems="baseline" gap={0.5}>
											<Text textStyle="secondary.lg" color="onSurface">
												{tier.price}
											</Text>
											<Text textStyle="secondary.xs" color="onSurfaceVariant">
												{tier.period}
											</Text>
										</Flex>
									)}
								</Flex>
								{tier.badge && (
									<Text
										textStyle="secondary.xs"
										color="primary"
										paddingInline={2}
										paddingBlock={0.5}
										borderRadius="full"
										bg="primary/10"
									>
										{tier.badge}
									</Text>
								)}
								{tier.cta && (
									<styled.button
										type="button"
										onClick={() => handleUpgrade()}
										paddingBlock={1.5}
										paddingInline={4}
										borderRadius="md"
										border="none"
										background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
										color="white"
										textStyle="secondary.xs"
										fontWeight="600"
										cursor="pointer"
										transition="opacity 0.15s"
										_hover={{ opacity: 0.9 }}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
									>
										{tier.cta}
									</styled.button>
								)}
							</Flex>
							<VStack alignItems="stretch" gap={1.5}>
								{tier.features.map((feature) => (
									<Flex key={feature} alignItems="center" gap={2}>
										<Check size={14} color="#623153" aria-hidden />
										<Text textStyle="secondary.sm" color="onSurfaceVariant">
											{feature}
										</Text>
									</Flex>
								))}
							</VStack>
						</Box>
					))}

					<Box paddingBlock={4} paddingInline={5} borderRadius="lg" bg="surfaceContainerLow">
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
							Need more?{' '}
							<styled.a
								href="mailto:hello@meldar.ai"
								color="primary"
								textDecoration="underline"
								_hover={{ textDecoration: 'none' }}
							>
								Contact us
							</styled.a>
						</Text>
					</Box>
				</VStack>

				{toast && (
					<Box
						position="fixed"
						insetBlockEnd={6}
						insetInlineEnd={6}
						paddingBlock={3}
						paddingInline={4}
						borderRadius="lg"
						bg="onSurface"
						color="surface"
						boxShadow="xl"
						zIndex={60}
						maxWidth="320px"
					>
						<Text as="p" textStyle="secondary.sm">
							{toast}
						</Text>
					</Box>
				)}
			</Box>
		</Box>
	)
}
