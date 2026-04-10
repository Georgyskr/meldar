'use client'

import { Box, Flex, HStack, styled, VStack } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui'

type Message = {
	readonly id: string
	readonly role: 'user' | 'assistant'
	readonly content: string
	readonly affirmation?: string
}

type Phase = 'collecting' | 'awaiting-ai' | 'recap' | 'generating' | 'ready' | 'failed'

const TEMPLATE_CHIPS = [
	{ label: 'Gym tracker', templateId: 'weight-tracker' },
	{ label: 'Habit tracker', templateId: 'task-manager' },
	{ label: 'Expense sorter', templateId: 'expense-tracker' },
	{ label: 'Booking page', templateId: 'booking-page' },
	{ label: 'Portfolio site', templateId: 'portfolio-site' },
	{ label: 'Client form', templateId: 'feedback-collector' },
	{ label: 'Dashboard', templateId: 'project-status-dashboard' },
	{ label: 'Team board', templateId: 'team-status-board' },
] as const

const AFFIRMATIONS = [
	"good — I know who it's for now",
	"that's the problem. the rest I can figure out.",
	"perfect — that's what the first screen should show",
]

const OPENER_MESSAGES: Message[] = [
	{
		id: 'sys-1',
		role: 'assistant',
		content: "Hey. I'm Meldar. I make small apps with people who've never written code.",
	},
	{
		id: 'sys-2',
		role: 'assistant',
		content: 'So — what are you making? Doesn\'t have to be polished. "A thing for my gym" works.',
	},
]

function generateId(): string {
	return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function OnboardingChat({ projectId }: { readonly projectId: string }) {
	const router = useRouter()
	const [messages, setMessages] = useState<Message[]>([...OPENER_MESSAGES])
	const [draft, setDraft] = useState('')
	const [phase, setPhase] = useState<Phase>('collecting')
	const [questionIndex, setQuestionIndex] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const scrollRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
		})
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [scrollToBottom])

	const addMessage = useCallback((msg: Message) => {
		setMessages((prev) => [...prev, msg])
	}, [])

	const askNextQuestion = useCallback(
		async (allMessages: Message[], nextIndex: number) => {
			if (nextIndex >= 3) {
				const userMessages = allMessages.filter((m) => m.role === 'user')
				const summary = userMessages.map((m) => m.content).join('. ')
				setPhase('recap')

				const recapMsg: Message = {
					id: generateId(),
					role: 'assistant',
					content: `Okay — here's what I heard. ${summary}. Right?`,
				}
				setMessages((prev) => [...prev, recapMsg])
				return
			}

			setPhase('awaiting-ai')

			try {
				const apiMessages = allMessages
					.filter((m) => m.id !== 'sys-1' && m.id !== 'sys-2')
					.map((m) => ({ role: m.role, content: m.content }))

				const res = await fetch(`/api/workspace/${projectId}/ask-question`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages:
							apiMessages.length > 0
								? apiMessages
								: [{ role: 'user', content: allMessages.at(-1)?.content ?? '' }],
						questionIndex: nextIndex + 1,
					}),
				})

				const data = (await res.json()) as { question?: string }
				const question = data.question ?? 'Tell me more about what you need.'

				const aiMsg: Message = {
					id: generateId(),
					role: 'assistant',
					content: question,
				}
				setMessages((prev) => [...prev, aiMsg])
				setQuestionIndex(nextIndex + 1)
				setPhase('collecting')
			} catch {
				setPhase('collecting')
				const fallback: Message = {
					id: generateId(),
					role: 'assistant',
					content: "What's the thing that bugs you about doing this manually right now?",
				}
				setMessages((prev) => [...prev, fallback])
				setQuestionIndex(nextIndex + 1)
			}
		},
		[projectId],
	)

	const handleSend = useCallback(
		async (text: string) => {
			const trimmed = text.trim()
			if (!trimmed || phase === 'awaiting-ai' || phase === 'generating') return

			const userMsg: Message = {
				id: generateId(),
				role: 'user',
				content: trimmed,
				affirmation: AFFIRMATIONS[questionIndex],
			}
			const updated = [...messages, userMsg]
			addMessage(userMsg)
			setDraft('')

			await askNextQuestion(updated, questionIndex)
		},
		[phase, questionIndex, messages, addMessage, askNextQuestion],
	)

	const handleChipClick = useCallback(
		async (templateId: string, label: string) => {
			const userMsg: Message = {
				id: generateId(),
				role: 'user',
				content: `a ${label.toLowerCase()}`,
			}
			addMessage(userMsg)
			setPhase('generating')

			const genMsg: Message = {
				id: generateId(),
				role: 'assistant',
				content: `Great pick. Setting up your ${label.toLowerCase()} now...`,
			}
			addMessage(genMsg)

			try {
				const res = await fetch(`/api/workspace/${projectId}/apply-template`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ templateId }),
				})
				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
					throw new Error(body.error?.message ?? `HTTP ${res.status}`)
				}

				setPhase('ready')
				addMessage({
					id: generateId(),
					role: 'assistant',
					content: "Done — here's your first step.",
				})
				setTimeout(() => router.refresh(), 600)
			} catch (err) {
				setPhase('failed')
				setError(err instanceof Error ? err.message : 'Something went wrong.')
				addMessage({
					id: generateId(),
					role: 'assistant',
					content: "Hmm, that didn't work. Try again?",
				})
			}
		},
		[projectId, addMessage, router],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				void handleSend(draft)
			}
		},
		[draft, handleSend],
	)

	const handleRecapConfirm = useCallback(async () => {
		setPhase('generating')
		const genMsg: Message = {
			id: generateId(),
			role: 'assistant',
			content: "Great — let me sketch out a plan for you. This'll take a few seconds.",
		}
		addMessage(genMsg)

		try {
			const apiMessages = messages
				.filter((m) => m.id !== 'sys-1' && m.id !== 'sys-2')
				.map((m) => ({ role: m.role, content: m.content }))

			apiMessages.push({ role: 'user', content: "Yes, that's right. Generate the plan." })

			const res = await fetch(`/api/workspace/${projectId}/generate-plan`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: apiMessages }),
			})

			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
				throw new Error(body.error?.message ?? `HTTP ${res.status}`)
			}

			setPhase('ready')
			const doneMsg: Message = {
				id: generateId(),
				role: 'assistant',
				content: "Alright — I've got a plan. But let's not look at all of it yet. Here's step one.",
			}
			addMessage(doneMsg)

			router.refresh()
		} catch (err) {
			setPhase('failed')
			setError(err instanceof Error ? err.message : 'Something went wrong generating the plan.')
			const failMsg: Message = {
				id: generateId(),
				role: 'assistant',
				content: 'Hmm, I had trouble making the plan. Let me try again?',
			}
			addMessage(failMsg)
		}
	}, [messages, projectId, addMessage, router])

	const handleRecapFix = useCallback(() => {
		setPhase('collecting')
		const fixMsg: Message = {
			id: generateId(),
			role: 'assistant',
			content: 'No problem — what should I change?',
		}
		addMessage(fixMsg)
	}, [addMessage])

	const handleRetry = useCallback(() => {
		setError(null)
		void handleRecapConfirm()
	}, [handleRecapConfirm])

	const showChips = messages.length <= 2

	return (
		<Flex direction="column" position="absolute" inset={0} background="surface">
			<Box
				ref={scrollRef}
				flex="1"
				overflowY="auto"
				paddingInline={6}
				paddingBlock={8}
				aria-live="polite"
			>
				<VStack alignItems="stretch" gap={4} maxWidth="560px" marginInline="auto">
					{messages.map((msg) => (
						<VStack
							key={msg.id}
							alignItems={msg.role === 'user' ? 'flex-end' : 'flex-start'}
							gap={1}
						>
							<Box
								maxWidth="85%"
								paddingBlock={3}
								paddingInline={4}
								borderRadius="16px"
								background={msg.role === 'user' ? 'primary/10' : 'surfaceContainerLowest'}
								border="1px solid"
								borderColor={msg.role === 'user' ? 'primary/20' : 'outlineVariant/30'}
							>
								<Text as="p" textStyle="body.md" color="onSurface" lineHeight="1.5">
									{msg.content}
								</Text>
							</Box>
							{msg.affirmation && (
								<Text textStyle="italic.sm" color="onSurfaceVariant/60" paddingInlineEnd={2}>
									{msg.affirmation}
								</Text>
							)}
						</VStack>
					))}

					{phase === 'awaiting-ai' && (
						<Box paddingInline={4}>
							<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
								thinking&hellip;
							</Text>
						</Box>
					)}

					{phase === 'generating' && (
						<Box paddingInline={4}>
							<Text textStyle="secondary.xs" color="primary">
								sketching your plan&hellip;
							</Text>
						</Box>
					)}

					{phase === 'ready' && (
						<Box paddingInline={4}>
							<Text textStyle="secondary.xs" color="success">
								plan ready — loading your workspace&hellip;
							</Text>
						</Box>
					)}

					{phase === 'failed' && error && (
						<Box
							paddingBlock={3}
							paddingInline={4}
							borderRadius="md"
							background="errorBg"
							border="1px solid"
							borderColor="errorBorder"
							aria-live="assertive"
						>
							<Text as="p" textStyle="secondary.xs" color="errorMuted">
								{error}
							</Text>
						</Box>
					)}
				</VStack>
			</Box>

			{phase === 'recap' && (
				<Box
					paddingBlock={4}
					paddingInline={6}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/30"
					background="surfaceContainerLowest"
				>
					<HStack gap={3} justifyContent="center">
						<styled.button
							type="button"
							onClick={handleRecapConfirm}
							paddingBlock={3}
							paddingInline={5}
							background="primary"
							color="surface"
							border="none"
							borderRadius="md"
							cursor="pointer"
							transition="all 0.15s"
							_hover={{ background: 'primary/90' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Text as="span" textStyle="button.md" color="surface">
								Yeah, that's it
							</Text>
						</styled.button>
						<styled.button
							type="button"
							onClick={handleRecapFix}
							paddingBlock={3}
							paddingInline={5}
							background="transparent"
							color="onSurface"
							border="1px solid"
							borderColor="outlineVariant/50"
							borderRadius="md"
							cursor="pointer"
							transition="all 0.15s"
							_hover={{ background: 'onSurface/4' }}
						>
							<Text as="span" textStyle="button.md" color="onSurface">
								Let me fix something
							</Text>
						</styled.button>
					</HStack>
				</Box>
			)}

			{phase === 'failed' && (
				<Box
					paddingBlock={4}
					paddingInline={6}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/30"
					background="surfaceContainerLowest"
				>
					<HStack gap={3} justifyContent="center">
						<styled.button
							type="button"
							onClick={handleRetry}
							paddingBlock={3}
							paddingInline={5}
							background="primary"
							color="surface"
							border="none"
							borderRadius="md"
							cursor="pointer"
						>
							<Text as="span" textStyle="button.md" color="surface">
								Try again
							</Text>
						</styled.button>
					</HStack>
				</Box>
			)}

			{phase === 'collecting' && (
				<Box
					paddingBlock={4}
					paddingInline={6}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/30"
					background="surfaceContainerLowest"
				>
					<VStack alignItems="stretch" gap={3} maxWidth="560px" marginInline="auto">
						{showChips && (
							<Flex gap={2} flexWrap="wrap">
								{TEMPLATE_CHIPS.map((chip) => (
									<styled.button
										key={chip.templateId}
										type="button"
										onClick={() => handleChipClick(chip.templateId, chip.label)}
										disabled={phase !== 'collecting'}
										paddingBlock={1.5}
										paddingInline={3}
										background="surfaceContainerLowest"
										border="1px solid"
										borderColor="outlineVariant/40"
										borderRadius="999px"
										cursor={phase === 'collecting' ? 'pointer' : 'wait'}
										_disabled={{ opacity: 0.5, cursor: 'wait' }}
										transition="all 0.12s"
										_hover={{
											borderColor: 'primary',
											background: 'primary/5',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
									>
										<Text textStyle="secondary.xs" color="onSurface">
											{chip.label}
										</Text>
									</styled.button>
								))}
							</Flex>
						)}

						<Flex gap={2} alignItems="flex-end">
							<styled.textarea
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={showChips ? 'a thing for my gym…' : 'type your answer…'}
								aria-label="Describe what you want to make"
								rows={1}
								flex="1"
								paddingBlock={3}
								paddingInline={4}
								borderRadius="12px"
								border="1px solid"
								borderColor="outlineVariant/50"
								background="surface"
								color="onSurface"
								resize="none"
								_focus={{
									borderColor: 'primary',
									outline: 'none',
								}}
								_placeholder={{ color: 'onSurfaceVariant/40' }}
							/>
							<styled.button
								type="button"
								onClick={() => handleSend(draft)}
								disabled={!draft.trim()}
								paddingBlock={3}
								paddingInline={4}
								background="primary"
								color="surface"
								border="none"
								borderRadius="12px"
								cursor={draft.trim() ? 'pointer' : 'not-allowed'}
								opacity={draft.trim() ? 1 : 0.4}
								transition="all 0.15s"
								_hover={{ background: draft.trim() ? 'primary/90' : 'primary' }}
								aria-label="Send message"
							>
								<Text as="span" textStyle="button.sm" color="surface" aria-hidden="true">
									→
								</Text>
							</styled.button>
						</Flex>

						{showChips && (
							<Flex justifyContent="space-between" paddingInline={1}>
								<Text textStyle="secondary.xs" color="onSurfaceVariant/40">
									rough is fine
								</Text>
								<styled.button
									type="button"
									onClick={() => {
										setMessages([])
										setPhase('collecting')
										router.push(`/workspace/${projectId}?skip-onboarding=1`)
									}}
									background="transparent"
									border="none"
									cursor="pointer"
									padding={0}
									_focusVisible={{
										outline: '2px solid',
										outlineColor: 'primary',
										outlineOffset: '2px',
									}}
								>
									<Text
										textStyle="secondary.xs"
										color="onSurfaceVariant/60"
										_hover={{ color: 'primary' }}
									>
										already know what you want? pick from templates →
									</Text>
								</styled.button>
							</Flex>
						)}
					</VStack>
				</Box>
			)}
		</Flex>
	)
}
