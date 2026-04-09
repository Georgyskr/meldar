'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useEffect, useId, useRef } from 'react'
import { Heading, Text } from '@/shared/ui'

export type RoadmapDrawerProps = {
	readonly open: boolean
	readonly onClose: () => void
}

const STEPS = [
	{ index: 1, label: 'Setup', state: 'available' as const },
	{ index: 2, label: 'First prompt', state: 'locked' as const },
	{ index: 3, label: 'Connect data', state: 'locked' as const },
	{ index: 4, label: 'Run on real input', state: 'locked' as const },
	{ index: 5, label: 'Train your voice', state: 'locked' as const },
	{ index: 6, label: 'Build the app', state: 'locked' as const },
	{ index: 7, label: 'Deploy preview', state: 'locked' as const },
	{ index: 8, label: 'Ship #1', state: 'locked' as const },
]

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function RoadmapDrawer({ open, onClose }: RoadmapDrawerProps) {
	const titleId = useId()
	const dialogRef = useRef<HTMLDivElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const previouslyFocusedRef = useRef<HTMLElement | null>(null)

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
			const dialog = dialogRef.current
			if (!dialog) return
			const focusables = Array.from(
				dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			).filter((el) => !el.hasAttribute('disabled'))
			if (focusables.length === 0) {
				e.preventDefault()
				return
			}
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const active = document.activeElement as HTMLElement | null
			if (e.shiftKey) {
				if (active === first || !dialog.contains(active)) {
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

	if (!open) return null

	return (
		<Box position="fixed" inset={0} zIndex={50}>
			<styled.button
				type="button"
				onClick={onClose}
				position="absolute"
				inset={0}
				bg="black/40"
				border="none"
				cursor="pointer"
				aria-hidden="true"
				tabIndex={-1}
			/>
			<Box
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				position="absolute"
				insetInlineEnd={0}
				insetBlockStart={0}
				insetBlockEnd={0}
				width={{ base: '100%', md: '420px' }}
				bg="surface"
				borderInlineStart="1px solid"
				borderColor="outlineVariant/40"
				padding={6}
				overflowY="auto"
			>
				<Flex justifyContent="space-between" alignItems="center" marginBlockEnd={5}>
					<Heading id={titleId} textStyle="primary.xs" color="onSurface">
						Your roadmap
					</Heading>
					<styled.button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						bg="transparent"
						border="none"
						color="onSurfaceVariant"
						fontSize="lg"
						cursor="pointer"
						padding={1}
						aria-label="Close roadmap"
					>
						×
					</styled.button>
				</Flex>
				<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" marginBlockEnd={5}>
					Eight steps from "I have an idea" to "Ship #1." You unlock each as you finish the previous
					one.
				</Text>
				<VStack alignItems="stretch" gap={2}>
					{STEPS.map((step) => (
						<Flex
							key={step.index}
							alignItems="center"
							gap={3}
							padding={3}
							borderRadius="md"
							bg={step.state === 'available' ? 'surfaceContainerHigh' : 'surfaceContainer'}
							opacity={step.state === 'locked' ? 0.55 : 1}
						>
							<Text textStyle="secondary.xs" color="onSurfaceVariant" minWidth="24px">
								{step.index}
							</Text>
							<Text textStyle="secondary.sm" color="onSurface">
								{step.label}
							</Text>
							{step.state === 'locked' && (
								<Text textStyle="secondary.xs" color="onSurfaceVariant/70" marginInlineStart="auto">
									Locked
								</Text>
							)}
						</Flex>
					))}
				</VStack>
			</Box>
		</Box>
	)
}
