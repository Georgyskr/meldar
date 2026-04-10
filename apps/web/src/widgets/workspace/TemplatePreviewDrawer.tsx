'use client'

import type { TemplatePlan } from '@meldar/orchestrator'
import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ChevronDown, ChevronRight, Clock, Coins, Layers, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Heading, Text } from '@/shared/ui'

export type TemplatePreviewDrawerProps = {
	readonly templateId: string | null
	readonly tokenBalance: number
	readonly estimatedTokens?: number | null
	readonly onStart: (templateId: string, templateName: string) => void
	readonly onClose: () => void
}

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function difficultyFromMilestones(count: number): string {
	if (count <= 3) return 'Beginner'
	if (count === 4) return 'Intermediate'
	return 'Advanced'
}

export function TemplatePreviewDrawer({
	templateId,
	tokenBalance,
	estimatedTokens: estimatedTokensProp,
	onStart,
	onClose,
}: TemplatePreviewDrawerProps) {
	const titleId = useId()
	const drawerRef = useRef<HTMLDivElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const previouslyFocusedRef = useRef<HTMLElement | null>(null)

	const [plan, setPlan] = useState<TemplatePlan | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set([0]))

	useEffect(() => {
		if (!templateId) {
			setPlan(null)
			setError(null)
			return
		}

		let cancelled = false
		setLoading(true)
		setError(null)
		setExpandedMilestones(new Set([0]))

		fetch(`/api/workspace/templates/${templateId}`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.json() as Promise<TemplatePlan>
			})
			.then((data) => {
				if (!cancelled) {
					setPlan(data)
					setLoading(false)
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load template')
					setLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [templateId])

	useEffect(() => {
		if (!templateId) return

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
	}, [templateId, onClose])

	const toggleMilestone = useCallback((index: number) => {
		setExpandedMilestones((prev) => {
			const next = new Set(prev)
			if (next.has(index)) {
				next.delete(index)
			} else {
				next.add(index)
			}
			return next
		})
	}, [])

	const handleStart = useCallback(() => {
		if (plan && templateId) {
			onStart(templateId, plan.name)
		}
	}, [plan, templateId, onStart])

	if (!templateId) return null

	const estimatedTokens =
		estimatedTokensProp ??
		(plan?.milestones.reduce((sum, m) => sum + m.subtasks.length, 0) ?? 0) * 3
	const estimatedMinutes = (plan?.milestones.length ?? 0) * 7
	const tokensRemaining = tokenBalance - estimatedTokens

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
				width={{ base: '100%', md: '480px' }}
				bg="surface"
				borderInlineStart="2px solid"
				borderColor="onSurface"
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
					borderColor="onSurface/15"
					flexShrink={0}
				>
					<Heading id={titleId} textStyle="primary.sm" color="onSurface">
						{plan?.name ?? 'Loading...'}
					</Heading>
					<styled.button
						ref={closeButtonRef}
						type="button"
						onClick={() => onClose()}
						padding={1}
						color="onSurfaceVariant"
						cursor="pointer"
						bg="transparent"
						border="none"
						transition="color 0.15s"
						_hover={{ color: 'onSurface' }}
						aria-label="Close preview"
					>
						<X size={18} />
					</styled.button>
				</Flex>

				{loading && (
					<Flex flex="1" alignItems="center" justifyContent="center" padding={6}>
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
							Loading template...
						</Text>
					</Flex>
				)}

				{error && (
					<Box padding={6}>
						<Box
							paddingBlock={3}
							paddingInline={4}
							border="1px solid"
							borderColor="red.300"
							bg="red.50"
						>
							<Text as="p" role="alert" textStyle="secondary.xs" color="red.700">
								{error}
							</Text>
						</Box>
					</Box>
				)}

				{plan && !loading && (
					<>
						<VStack alignItems="stretch" gap={5} padding={6} flex="1">
							<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
								{plan.description}
							</Text>

							<Flex gap={4} flexWrap="wrap">
								<Flex alignItems="center" gap={1.5}>
									<Layers size={14} color="#623153" aria-hidden />
									<Text textStyle="tertiary.sm" color="onSurfaceVariant">
										{difficultyFromMilestones(plan.milestones.length)}
									</Text>
								</Flex>
								<Flex alignItems="center" gap={1.5}>
									<Clock size={14} color="#623153" aria-hidden />
									<Text textStyle="tertiary.sm" color="onSurfaceVariant">
										~{estimatedMinutes} min
									</Text>
								</Flex>
								<Flex alignItems="center" gap={1.5}>
									<Coins size={14} color="#623153" aria-hidden />
									<Text textStyle="tertiary.sm" color="onSurfaceVariant">
										~{estimatedTokens} tokens
									</Text>
								</Flex>
							</Flex>

							<VStack alignItems="stretch" gap={0}>
								<Flex
									alignItems="center"
									gap={2}
									paddingBlockEnd={3}
									borderBlockEnd="2px solid"
									borderColor="onSurface"
								>
									<Zap size={14} color="#623153" aria-hidden />
									<Text textStyle="tertiary.sm" color="primary">
										What you'll make
									</Text>
								</Flex>

								<VStack alignItems="stretch" gap={0}>
									{plan.milestones.map((milestone, index) => {
										const expanded = expandedMilestones.has(index)
										return (
											<VStack
												key={milestone.title}
												alignItems="stretch"
												gap={0}
												borderBlockEnd="1px solid"
												borderColor="onSurface/10"
											>
												<styled.button
													type="button"
													onClick={() => toggleMilestone(index)}
													display="flex"
													alignItems="flex-start"
													gap={2}
													paddingBlock={3}
													paddingInline={0}
													background="transparent"
													border="none"
													cursor="pointer"
													textAlign="start"
													width="100%"
													_hover={{ background: 'primary/3' }}
												>
													<Box flexShrink={0} marginBlockStart="2px" color="onSurfaceVariant">
														{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
													</Box>
													<VStack alignItems="flex-start" gap={0.5} flex="1">
														<Text textStyle="primary.xs" color="onSurface">
															{milestone.title}
														</Text>
														<Text textStyle="italic.sm" color="primary">
															What you'll add: {milestone.whatYouLearn.toLowerCase()}
														</Text>
														{!expanded && (
															<Text textStyle="tertiary.sm" color="onSurfaceVariant/60">
																{milestone.subtasks.length} subtask
																{milestone.subtasks.length !== 1 ? 's' : ''}
															</Text>
														)}
													</VStack>
												</styled.button>
												{expanded && (
													<VStack
														alignItems="stretch"
														gap={1}
														paddingInlineStart={6}
														paddingBlockEnd={3}
													>
														{milestone.subtasks.map((subtask) => (
															<Flex
																key={subtask.title}
																alignItems="center"
																gap={2}
																paddingBlock={1}
															>
																<Box width="4px" height="4px" bg="primary/40" flexShrink={0} />
																<Text textStyle="secondary.xs" color="onSurfaceVariant">
																	{subtask.title}
																</Text>
															</Flex>
														))}
													</VStack>
												)}
											</VStack>
										)
									})}
								</VStack>
							</VStack>

							<VStack alignItems="stretch" gap={2}>
								<Flex
									alignItems="center"
									gap={2}
									paddingBlockEnd={3}
									borderBlockEnd="1px solid"
									borderColor="onSurface/15"
								>
									<Coins size={14} color="#623153" aria-hidden />
									<Text textStyle="tertiary.sm" color="primary">
										Cost
									</Text>
								</Flex>
								<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
									This will use ~{estimatedTokens} of your {tokenBalance} tokens.
								</Text>
								{tokensRemaining > 0 && (
									<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/70">
										You'll have ~{tokensRemaining} left for more projects.
									</Text>
								)}
								{tokensRemaining <= 0 && (
									<Text as="p" textStyle="secondary.xs" color="amber.600">
										You may not have enough tokens to finish this project. You earn 15 free tokens
										daily.
									</Text>
								)}
							</VStack>
						</VStack>

						<Flex
							gap={3}
							justifyContent="flex-end"
							paddingBlock={4}
							paddingInline={6}
							borderBlockStart="2px solid"
							borderColor="onSurface"
							flexShrink={0}
						>
							<styled.button
								type="button"
								onClick={() => onClose()}
								paddingBlock={2.5}
								paddingInline={5}
								background="transparent"
								border="1.5px solid"
								borderColor="onSurface"
								color="onSurface"
								cursor="pointer"
								transition="all 0.15s"
								_hover={{ bg: 'onSurface', color: 'surface' }}
							>
								<Text textStyle="button.sm" color="inherit">
									Cancel
								</Text>
							</styled.button>
							<styled.button
								type="button"
								onClick={() => handleStart()}
								paddingBlock={2.5}
								paddingInline={5}
								border="none"
								bg="onSurface"
								color="surface"
								cursor="pointer"
								transition="all 0.15s"
								_hover={{ bg: 'primary' }}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
							>
								<Text textStyle="button.sm" color="surface">
									Start project
								</Text>
							</styled.button>
						</Flex>
					</>
				)}
			</Box>
		</Box>
	)
}
