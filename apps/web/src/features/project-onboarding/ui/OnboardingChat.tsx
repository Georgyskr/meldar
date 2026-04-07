'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { createInitialState, onboardingReducer, TOTAL_QUESTIONS } from '../model/onboarding-state'
import { OnboardingMessage } from './OnboardingMessage'

const STEP_KEYS = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => `step-${i}`)

export type OnboardingChatProps = {
	readonly projectId: string
	readonly projectName: string
	readonly onPlanGenerated: () => void
}

export function OnboardingChat({ projectId, projectName, onPlanGenerated }: OnboardingChatProps) {
	const [state, dispatch] = useReducer(onboardingReducer, projectName, createInitialState)
	const [draft, setDraft] = useState('')
	const generateInFlightRef = useRef(false)
	const bottomRef = useRef<HTMLDivElement>(null)
	const messagesRef = useRef(state.messages)
	messagesRef.current = state.messages

	// biome-ignore lint/correctness/useExhaustiveDependencies: state.messages.length is an intentional trigger to scroll on new messages
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [state.messages.length])

	const askQuestion = useCallback(
		async (questionIndex: number) => {
			dispatch({ type: 'set_asking_question', value: true })
			try {
				const response = await fetch(`/api/workspace/${projectId}/ask-question`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: messagesRef.current,
						questionIndex,
					}),
				})
				if (!response.ok) {
					throw new Error(`Failed to get question: ${response.status}`)
				}
				const data = (await response.json()) as { question: string }
				dispatch({ type: 'add_question', content: data.question })
			} catch {
				dispatch({ type: 'add_question', content: getFallbackQuestion(questionIndex) })
			}
		},
		[projectId],
	)

	useEffect(() => {
		const nextQuestionIndex = state.currentStep + 1
		const isWaitingForQuestion =
			nextQuestionIndex <= TOTAL_QUESTIONS &&
			!state.isAskingQuestion &&
			!state.isGenerating &&
			!state.planGenerated &&
			state.messages[state.messages.length - 1]?.role === 'user'

		if (isWaitingForQuestion) {
			askQuestion(nextQuestionIndex)
		}
	}, [
		state.currentStep,
		state.messages,
		state.isAskingQuestion,
		state.isGenerating,
		state.planGenerated,
		askQuestion,
	])

	const generatePlan = useCallback(async () => {
		if (generateInFlightRef.current) return
		generateInFlightRef.current = true
		dispatch({ type: 'set_generating', value: true })

		try {
			const response = await fetch(`/api/workspace/${projectId}/generate-plan`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: messagesRef.current }),
			})
			if (!response.ok) {
				throw new Error(`Plan generation failed: ${response.status}`)
			}
			dispatch({ type: 'plan_generated' })
			onPlanGenerated()
		} catch {
			dispatch({ type: 'set_generating', value: false })
		} finally {
			generateInFlightRef.current = false
		}
	}, [projectId, onPlanGenerated])

	useEffect(() => {
		const hasAllAnswers = state.currentStep >= TOTAL_QUESTIONS
		const lastMessage = state.messages[state.messages.length - 1]
		if (
			hasAllAnswers &&
			lastMessage?.role === 'user' &&
			!state.isGenerating &&
			!state.planGenerated
		) {
			generatePlan()
		}
	}, [state.currentStep, state.messages, state.isGenerating, state.planGenerated, generatePlan])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const trimmed = draft.trim()
		if (!trimmed || state.isAskingQuestion || state.isGenerating) return
		dispatch({ type: 'add_answer', content: trimmed })
		setDraft('')
	}

	const showInput =
		!state.isGenerating &&
		!state.planGenerated &&
		state.messages[state.messages.length - 1]?.role === 'assistant'

	return (
		<Flex direction="column" height="100%">
			<Box
				paddingBlock={4}
				paddingInline={4}
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/30"
			>
				<styled.p textStyle="body.xs" color="onSurfaceVariant" fontWeight="500">
					Step {Math.min(state.currentStep + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
				</styled.p>
				<Flex gap={1} marginBlockStart={2}>
					{STEP_KEYS.map((stepKey, i) => (
						<Box
							key={stepKey}
							height="4px"
							flex={1}
							borderRadius="full"
							background={i <= state.currentStep ? 'primary' : 'outlineVariant/30'}
							transition="background 0.2s ease"
						/>
					))}
				</Flex>
			</Box>

			<Box flex={1} overflowY="auto" paddingBlock={4}>
				<VStack alignItems="stretch" gap={2}>
					{state.messages.map((msg, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: append-only message list
						<OnboardingMessage key={i} role={msg.role} content={msg.content} />
					))}
					{state.isAskingQuestion && <TypingIndicator />}
					{state.isGenerating && <GeneratingIndicator />}
					<div ref={bottomRef} />
				</VStack>
			</Box>

			{showInput && (
				<Box
					as="form"
					onSubmit={handleSubmit}
					paddingBlock={3}
					paddingInline={4}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/30"
					background="surfaceContainerLowest"
				>
					<Flex gap={2}>
						<styled.input
							type="text"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="Type your answer..."
							flex={1}
							paddingBlock={2}
							paddingInline={3}
							borderRadius="md"
							border="1px solid"
							borderColor="outlineVariant/50"
							background="surface"
							color="onSurface"
							textStyle="body.sm"
							_focus={{
								outline: 'none',
								borderColor: 'primary',
								boxShadow: '0 0 0 2px token(colors.primary/20)',
							}}
						/>
						<styled.button
							type="submit"
							disabled={!draft.trim()}
							paddingBlock={2}
							paddingInline={4}
							borderRadius="md"
							background="primary"
							color="onPrimary"
							fontWeight="600"
							textStyle="body.sm"
							cursor="pointer"
							transition="opacity 0.15s"
							_hover={{ opacity: 0.9 }}
							_disabled={{
								opacity: 0.4,
								cursor: 'not-allowed',
							}}
						>
							Send
						</styled.button>
					</Flex>
				</Box>
			)}
		</Flex>
	)
}

function TypingIndicator() {
	return (
		<Box paddingInline={4} paddingBlock={1} display="flex" justifyContent="flex-start">
			<Box
				paddingBlock={3}
				paddingInline={4}
				borderRadius="xl"
				borderBottomLeftRadius="sm"
				background="surfaceContainerHigh"
			>
				<styled.span textStyle="body.sm" color="onSurfaceVariant">
					...
				</styled.span>
			</Box>
		</Box>
	)
}

function GeneratingIndicator() {
	return (
		<Box paddingInline={4} paddingBlock={1} display="flex" justifyContent="flex-start">
			<Box
				paddingBlock={3}
				paddingInline={4}
				borderRadius="xl"
				borderBottomLeftRadius="sm"
				background="surfaceContainerHigh"
			>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					Creating your build plan...
				</styled.span>
			</Box>
		</Box>
	)
}

function getFallbackQuestion(index: number): string {
	const fallbacks = [
		'What is the main thing you want to see when you open this app?',
		'How do you want to input your data — typing it in, uploading a file, or something else?',
		'Is this just for you, or do you want other people to use it too?',
		'Do you want any notifications or reminders, or just check the app when you feel like it?',
		'Anything else I should know about what you want to build?',
	]
	return fallbacks[index - 1] ?? fallbacks[4]
}
