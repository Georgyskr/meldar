'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { MessageSquare, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Text, toast } from '@/shared/ui'

type Props = {
	readonly onModificationRequest: (request: ModificationRequest) => Promise<void>
}

export type ModificationRequest = {
	readonly elementSelector: string
	readonly elementDescription: string
	readonly instruction: string
}

type FeedbackState =
	| { step: 'idle' }
	| { step: 'selecting' }
	| { step: 'describing'; elementSelector: string; elementDescription: string }
	| { step: 'submitting' }

export function VisualFeedbackPanel({ onModificationRequest }: Props) {
	const [state, setState] = useState<FeedbackState>({ step: 'idle' })
	const inputRef = useRef<HTMLTextAreaElement>(null)

	const startSelecting = useCallback(() => {
		setState({ step: 'selecting' })
	}, [])

	const cancelSelection = useCallback(() => {
		setState({ step: 'idle' })
	}, [])

	const _onElementSelected = useCallback((selector: string, description: string) => {
		setState({ step: 'describing', elementSelector: selector, elementDescription: description })
		setTimeout(() => inputRef.current?.focus(), 50)
	}, [])

	const submitFeedback = useCallback(async () => {
		if (state.step !== 'describing') return
		const instruction = inputRef.current?.value?.trim()
		if (!instruction) return

		setState({ step: 'submitting' })
		try {
			await onModificationRequest({
				elementSelector: state.elementSelector,
				elementDescription: state.elementDescription,
				instruction,
			})
			toast.success('Change applied')
			setState({ step: 'idle' })
		} catch {
			toast.error('Failed to apply change', 'Try again or describe it differently')
			setState({
				step: 'describing',
				elementSelector: state.elementSelector,
				elementDescription: state.elementDescription,
			})
		}
	}, [state, onModificationRequest])

	if (state.step === 'idle') {
		return (
			<Box
				position="fixed"
				insetBlockEnd={16}
				insetInlineStart="50%"
				transform="translateX(-50%)"
				zIndex={100}
			>
				<styled.button
					type="button"
					onClick={startSelecting}
					display="inline-flex"
					alignItems="center"
					gap={2}
					paddingBlock={3}
					paddingInline={5}
					bg="onSurface"
					color="surface"
					border="none"
					borderRadius="full"
					cursor="pointer"
					boxShadow="0 4px 24px rgba(0,0,0,0.15)"
					transition="all 0.15s"
					_hover={{ transform: 'translateY(-1px)', boxShadow: '0 6px 28px rgba(0,0,0,0.2)' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<MessageSquare size={16} />
					<Text as="span" textStyle="button.sm" color="surface">
						Change something
					</Text>
				</styled.button>
			</Box>
		)
	}

	if (state.step === 'selecting') {
		return (
			<Box
				position="fixed"
				insetBlockEnd={16}
				insetInlineStart="50%"
				transform="translateX(-50%)"
				zIndex={100}
			>
				<Flex
					alignItems="center"
					gap={3}
					paddingBlock={3}
					paddingInline={5}
					bg="primary"
					color="onPrimary"
					borderRadius="full"
					boxShadow="0 4px 24px rgba(98,49,83,0.3)"
				>
					<Text as="span" textStyle="button.sm" color="onPrimary">
						Click on any element to change it
					</Text>
					<styled.button
						type="button"
						onClick={cancelSelection}
						background="none"
						border="none"
						cursor="pointer"
						color="onPrimary"
						padding={1}
					>
						<X size={16} />
					</styled.button>
				</Flex>
			</Box>
		)
	}

	if (state.step === 'describing' || state.step === 'submitting') {
		const busy = state.step === 'submitting'
		return (
			<Box
				position="fixed"
				insetBlockEnd={0}
				insetInlineStart={0}
				insetInlineEnd={0}
				zIndex={100}
				bg="surface"
				borderBlockStart="1px solid"
				borderColor="outlineVariant/40"
				boxShadow="0 -4px 24px rgba(0,0,0,0.08)"
				paddingBlock={4}
				paddingInline={5}
			>
				<Flex direction="column" gap={2} maxWidth="640px" marginInline="auto">
					<Flex justifyContent="space-between" alignItems="center">
						<Text textStyle="label.sm" color="onSurfaceVariant">
							{state.step === 'describing'
								? `Selected: ${(state as { elementDescription: string }).elementDescription}`
								: 'Applying change...'}
						</Text>
						<styled.button
							type="button"
							onClick={cancelSelection}
							background="none"
							border="none"
							cursor="pointer"
							color="onSurfaceVariant"
							padding={1}
						>
							<X size={14} />
						</styled.button>
					</Flex>
					<styled.textarea
						ref={inputRef}
						placeholder='What do you want to change? e.g. "make it pink" or "change the price to 50"'
						disabled={busy}
						width="100%"
						minHeight="60px"
						padding={3}
						border="1px solid"
						borderColor="outlineVariant/40"
						borderRadius="md"
						fontFamily="body"
						fontSize="14px"
						resize="vertical"
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '-1px' }}
					/>
					<Flex gap={2}>
						<styled.button
							type="button"
							onClick={submitFeedback}
							disabled={busy}
							paddingBlock={2.5}
							paddingInline={5}
							bg="primary"
							color="onPrimary"
							border="none"
							borderRadius="md"
							cursor={busy ? 'wait' : 'pointer'}
							opacity={busy ? 0.6 : 1}
							_hover={{ bg: 'primary/90' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Text as="span" textStyle="button.sm" color="onPrimary">
								{busy ? 'Applying...' : 'Apply change'}
							</Text>
						</styled.button>
					</Flex>
				</Flex>
			</Box>
		)
	}

	return null
}
