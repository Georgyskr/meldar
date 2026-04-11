'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { parsePromptAnatomy } from '@/features/kanban'
import { Text } from '@/shared/ui'
import { AnatomyStrip } from './AnatomyStrip'

type Props = {
	readonly projectId: string
	readonly card: KanbanCard
	readonly buildsCompleted: number
	readonly onMake: (cardId: string, prompt: string) => void
}

type EnhanceState =
	| { readonly status: 'idle' }
	| { readonly status: 'enhancing' }
	| {
			readonly status: 'enhanced'
			readonly original: string
			readonly improved: string
			readonly explanation: string
	  }
	| { readonly status: 'error'; readonly message: string }

export function PromptEditor({ projectId, card, buildsCompleted, onMake }: Props) {
	const defaultPrompt = card.description ?? card.explainerText ?? `Make the ${card.title} step.`
	const [draft, setDraft] = useState(defaultPrompt)
	const [enhance, setEnhance] = useState<EnhanceState>({ status: 'idle' })
	const [showWhySent, setShowWhySent] = useState(false)

	useEffect(() => {
		setDraft(card.description ?? card.explainerText ?? `Make the ${card.title} step.`)
		setEnhance({ status: 'idle' })
		setShowWhySent(false)
	}, [card.description, card.explainerText, card.title])

	const anatomy = useMemo(() => parsePromptAnatomy(draft), [draft])

	const handleMake = useCallback(async () => {
		if (!draft.trim()) return

		if (buildsCompleted === 0) {
			onMake(card.id, draft)
			return
		}

		setEnhance({ status: 'enhancing' })

		try {
			const res = await fetch(`/api/workspace/${projectId}/improve-prompt`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: draft }),
			})

			if (!res.ok) {
				onMake(card.id, draft)
				setEnhance({ status: 'idle' })
				return
			}

			const data = (await res.json()) as {
				improved?: string
				explanation?: string
			}

			if (data.improved && data.improved !== draft) {
				setEnhance({
					status: 'enhanced',
					original: draft,
					improved: data.improved,
					explanation: data.explanation ?? 'Made it clearer for the AI.',
				})
				onMake(card.id, data.improved)
			} else {
				onMake(card.id, draft)
				setEnhance({ status: 'idle' })
			}
		} catch {
			onMake(card.id, draft)
			setEnhance({ status: 'idle' })
		}
	}, [draft, buildsCompleted, card.id, projectId, onMake])

	const isFirstBuild = buildsCompleted === 0

	return (
		<VStack alignItems="stretch" gap={4} maxWidth="560px">
			<VStack alignItems="stretch" gap={2}>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Step
				</Text>
				<Text textStyle="heading.3" color="onSurface">
					{card.title}
				</Text>
			</VStack>

			{card.explainerText && (
				<Box
					paddingBlock={3}
					paddingInline={4}
					background="surfaceContainerLowest"
					border="1px solid"
					borderColor="outlineVariant/40"
					borderRadius="md"
				>
					<Text textStyle="label.sm" color="onSurfaceVariant" marginBlockEnd={1}>
						What you'll add
					</Text>
					<Text as="p" textStyle="body.sm" color="onSurface">
						{card.explainerText}
					</Text>
				</Box>
			)}

			{!isFirstBuild && (
				<VStack alignItems="stretch" gap={2}>
					<Text textStyle="label.sm" color="onSurfaceVariant">
						Your prompt to the AI
					</Text>
					<styled.textarea
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value)
							if (enhance.status === 'enhanced') setEnhance({ status: 'idle' })
						}}
						rows={3}
						width="100%"
						paddingBlock={3}
						paddingInline={4}
						borderRadius="md"
						border="1px solid"
						borderColor="outlineVariant/50"
						background="surface"
						color="onSurface"
						resize="vertical"
						lineHeight="1.5"
						_focus={{
							borderColor: 'primary',
							outline: 'none',
						}}
						_placeholder={{ color: 'onSurfaceVariant/40' }}
					/>
					<AnatomyStrip anatomy={anatomy} />
				</VStack>
			)}

			{enhance.status === 'enhanced' && (
				<VStack
					alignItems="stretch"
					gap={2}
					paddingBlock={3}
					paddingInline={4}
					background="primary/4"
					borderRadius="md"
					border="1px solid"
					borderColor="primary/15"
				>
					<HStack gap={2} justifyContent="space-between">
						<Text textStyle="label.sm" color="onSurfaceVariant">
							we sent
						</Text>
						<styled.button
							type="button"
							onClick={() => setShowWhySent(!showWhySent)}
							background="transparent"
							border="none"
							cursor="pointer"
							minHeight="44px"
							minWidth="44px"
							display="inline-flex"
							alignItems="center"
							justifyContent="center"
							padding={0}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Text
								textStyle="secondary.xs"
								color="primary"
								_hover={{ textDecoration: 'underline' }}
							>
								{showWhySent ? 'hide' : 'why?'}
							</Text>
						</styled.button>
					</HStack>
					<Text as="p" textStyle="body.sm" color="onSurface" fontStyle="italic">
						{enhance.improved}
					</Text>
					{showWhySent && (
						<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant">
							{enhance.explanation}
						</Text>
					)}
					<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
						you wrote: {enhance.original}
					</Text>
				</VStack>
			)}

			<HStack gap={3} paddingBlockStart={isFirstBuild ? 2 : 0}>
				<styled.button
					type="button"
					onClick={() => handleMake()}
					disabled={enhance.status === 'enhancing'}
					paddingBlock={3}
					paddingInline={5}
					background="primary"
					color="surface"
					border="none"
					borderRadius="md"
					cursor={enhance.status === 'enhancing' ? 'wait' : 'pointer'}
					opacity={enhance.status === 'enhancing' ? 0.6 : 1}
					transition="all 0.15s"
					_hover={{ background: 'primary/90', transform: 'translateY(-1px)' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					<Text as="span" textStyle="button.md" color="surface">
						{enhance.status === 'enhancing' ? 'Enhancing…' : 'Make this now'}
					</Text>
				</styled.button>
				{card.tokenCostEstimateMin !== null && (
					<Text textStyle="secondary.xs" color="onSurfaceVariant/60">
						~{card.tokenCostEstimateMin}–{card.tokenCostEstimateMax ?? card.tokenCostEstimateMin}{' '}
						energy
					</Text>
				)}
			</HStack>

			{isFirstBuild && (
				<Text textStyle="secondary.xs" color="onSurfaceVariant/40" fontStyle="italic">
					After your first step, you'll be able to write your own prompts here.
				</Text>
			)}
		</VStack>
	)
}
