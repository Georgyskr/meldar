'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { PartyPopper } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import type { BuildReceipt } from '@/features/workspace'
import { Heading, Text } from '@/shared/ui'

export type FirstBuildCelebrationProps = {
	readonly projectId: string
	readonly receipt: BuildReceipt
	readonly cards: readonly KanbanCard[]
}

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function storageKey(projectId: string): string {
	return `meldar:first-build-celebrated:${projectId}`
}

export function FirstBuildCelebration({ projectId, receipt, cards }: FirstBuildCelebrationProps) {
	const [visible, setVisible] = useState(false)
	const titleId = useId()
	const dialogRef = useRef<HTMLDivElement>(null)
	const dismissButtonRef = useRef<HTMLButtonElement>(null)
	const previouslyFocusedRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		const already = localStorage.getItem(storageKey(projectId))
		if (already) return

		const hasBuiltCard = cards.some((c) => c.state === 'built')
		if (!hasBuiltCard) return

		setVisible(true)
	}, [projectId, cards])

	const handleDismiss = useCallback(() => {
		localStorage.setItem(storageKey(projectId), '1')
		setVisible(false)
	}, [projectId])

	useEffect(() => {
		if (!visible) return

		previouslyFocusedRef.current = document.activeElement as HTMLElement | null
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		dismissButtonRef.current?.focus()

		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				handleDismiss()
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
	}, [visible, handleDismiss])

	const builtCard = cards.find((c) => c.id !== null && c.title === receipt.subtaskTitle)
	const learnedText = builtCard?.explainerText ?? null

	if (!visible) return null

	return (
		<Box
			position="fixed"
			inset={0}
			zIndex={50}
			display="flex"
			alignItems="center"
			justifyContent="center"
		>
			<styled.button
				type="button"
				onClick={() => handleDismiss()}
				position="absolute"
				inset={0}
				bg="black/50"
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
				position="relative"
				bg="surface"
				borderRadius="xl"
				border="1px solid"
				borderColor="outlineVariant/20"
				boxShadow="xl"
				width="90vw"
				maxWidth="420px"
				paddingBlock={8}
				paddingInline={6}
				zIndex={51}
			>
				<VStack alignItems="center" gap={4}>
					<Box
						width="56px"
						height="56px"
						borderRadius="full"
						bg="primary/10"
						display="flex"
						alignItems="center"
						justifyContent="center"
					>
						<PartyPopper size={28} color="#623153" />
					</Box>

					<Heading textStyle="primary.sm" id={titleId} color="onSurface" textAlign="center">
						Your first feature just shipped!
					</Heading>

					<VStack alignItems="center" gap={2}>
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
							You built:{' '}
							<Text textStyle="primary.xs" color="onSurface">
								{receipt.subtaskTitle}
							</Text>
						</Text>

						{learnedText && (
							<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
								You learned: {learnedText}
							</Text>
						)}
					</VStack>

					<Flex gap={3} marginBlockStart={2}>
						<styled.button
							ref={dismissButtonRef}
							type="button"
							onClick={() => handleDismiss()}
							paddingBlock={2.5}
							paddingInline={5}
							borderRadius="md"
							border="none"
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
							color="white"
							textStyle="secondary.sm"
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
							Keep building
						</styled.button>
					</Flex>
				</VStack>
			</Box>
		</Box>
	)
}
