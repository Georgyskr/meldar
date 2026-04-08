'use client'

import type { TemplatePlan } from '@meldar/orchestrator'
import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ChevronDown, ChevronRight, Clock, Coins, Layers, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

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
					<styled.h2
						id={titleId}
						fontFamily="heading"
						textStyle="heading.md"
						color="onSurface"
						fontWeight="700"
					>
						{plan?.name ?? 'Loading...'}
					</styled.h2>
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
						aria-label="Close preview"
					>
						<X size={18} />
					</styled.button>
				</Flex>

				{loading && (
					<Flex flex="1" alignItems="center" justifyContent="center" padding={6}>
						<styled.p textStyle="body.sm" color="onSurfaceVariant">
							Loading template...
						</styled.p>
					</Flex>
				)}

				{error && (
					<Box padding={6}>
						<Box paddingBlock={2} paddingInline={3} borderRadius="md" background="error/10">
							<styled.p role="alert" textStyle="body.xs" color="error">
								{error}
							</styled.p>
						</Box>
					</Box>
				)}

				{plan && !loading && (
					<>
						<VStack alignItems="stretch" gap={5} padding={6} flex="1">
							<styled.p textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.6">
								{plan.description}
							</styled.p>

							<Flex gap={4} flexWrap="wrap">
								<Flex alignItems="center" gap={1.5}>
									<Layers size={14} color="#81737a" aria-hidden />
									<styled.span textStyle="body.xs" color="onSurfaceVariant">
										{difficultyFromMilestones(plan.milestones.length)}
									</styled.span>
								</Flex>
								<Flex alignItems="center" gap={1.5}>
									<Clock size={14} color="#81737a" aria-hidden />
									<styled.span textStyle="body.xs" color="onSurfaceVariant">
										~{estimatedMinutes} min
									</styled.span>
								</Flex>
								<Flex alignItems="center" gap={1.5}>
									<Coins size={14} color="#81737a" aria-hidden />
									<styled.span textStyle="body.xs" color="onSurfaceVariant">
										~{estimatedTokens} tokens
									</styled.span>
								</Flex>
							</Flex>

							<VStack alignItems="stretch" gap={0}>
								<Flex
									alignItems="center"
									gap={2}
									paddingBlockEnd={3}
									borderBlockEnd="1px solid"
									borderColor="outlineVariant/20"
								>
									<Zap size={14} color="#623153" aria-hidden />
									<styled.span
										textStyle="body.xs"
										fontWeight="600"
										color="onSurfaceVariant"
										textTransform="uppercase"
										letterSpacing="wide"
									>
										What you'll build
									</styled.span>
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
												borderColor="outlineVariant/10"
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
													cursor="pointer"
													textAlign="start"
													width="100%"
													_hover={{ background: 'surfaceContainerLow' }}
												>
													<Box flexShrink={0} marginBlockStart="2px" color="onSurfaceVariant">
														{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
													</Box>
													<VStack alignItems="flex-start" gap={0.5} flex="1">
														<styled.span textStyle="body.sm" fontWeight="600" color="onSurface">
															{milestone.title}
														</styled.span>
														<styled.span textStyle="body.xs" color="primary" fontStyle="italic">
															You'll learn: {milestone.whatYouLearn.toLowerCase()}
														</styled.span>
														{!expanded && (
															<styled.span textStyle="body.xs" color="onSurfaceVariant/60">
																{milestone.subtasks.length} subtask
																{milestone.subtasks.length !== 1 ? 's' : ''}
															</styled.span>
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
																<Box
																	width="6px"
																	height="6px"
																	borderRadius="full"
																	bg="outlineVariant/50"
																	flexShrink={0}
																/>
																<styled.span textStyle="body.xs" color="onSurfaceVariant">
																	{subtask.title}
																</styled.span>
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
									borderColor="outlineVariant/20"
								>
									<Coins size={14} color="#623153" aria-hidden />
									<styled.span
										textStyle="body.xs"
										fontWeight="600"
										color="onSurfaceVariant"
										textTransform="uppercase"
										letterSpacing="wide"
									>
										Cost
									</styled.span>
								</Flex>
								<styled.p textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.6">
									This will use ~{estimatedTokens} of your {tokenBalance} tokens.
								</styled.p>
								{tokensRemaining > 0 && (
									<styled.p textStyle="body.xs" color="onSurfaceVariant/70">
										You'll have ~{tokensRemaining} left for more projects.
									</styled.p>
								)}
								{tokensRemaining <= 0 && (
									<styled.p textStyle="body.xs" color="amber.600">
										You may not have enough tokens to finish this project. You earn 15 free tokens
										daily.
									</styled.p>
								)}
							</VStack>
						</VStack>

						<Flex
							gap={3}
							justifyContent="flex-end"
							paddingBlock={4}
							paddingInline={6}
							borderBlockStart="1px solid"
							borderColor="outlineVariant/20"
							flexShrink={0}
						>
							<styled.button
								type="button"
								onClick={() => onClose()}
								paddingBlock={2.5}
								paddingInline={5}
								borderRadius="md"
								background="transparent"
								color="onSurfaceVariant"
								textStyle="body.sm"
								fontWeight="500"
								cursor="pointer"
								transition="color 0.15s"
								_hover={{ color: 'onSurface' }}
							>
								Cancel
							</styled.button>
							<styled.button
								type="button"
								onClick={() => handleStart()}
								paddingBlock={2.5}
								paddingInline={5}
								borderRadius="md"
								border="none"
								background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
								color="white"
								textStyle="body.sm"
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
								Start building
							</styled.button>
						</Flex>
					</>
				)}
			</Box>
		</Box>
	)
}
