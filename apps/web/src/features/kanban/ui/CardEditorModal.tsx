'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { ChevronDown, ChevronRight, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { type PromptAnatomy, parsePromptAnatomy } from '../lib/parse-prompt-anatomy'
import { canTransition } from '../model/card-state-machine'
import { editingCardIdAtom } from '../model/kanban-atoms'

export type CardEditorModalProps = {
	readonly projectId: string
	readonly cards: readonly KanbanCard[]
	readonly onSave: (cardId: string, updates: CardEditorUpdates) => void
	readonly onDelete: (cardId: string) => void
	readonly onMarkReady: (cardId: string) => void
}

export type CardEditorUpdates = {
	readonly title: string
	readonly description: string | null
	readonly acceptanceCriteria: string[] | null
	readonly taskType: string
}

type ImproveResult = {
	readonly original: string
	readonly improved: string
	readonly explanation: string
}

export function CardEditorModal({
	projectId,
	cards,
	onSave,
	onDelete,
	onMarkReady,
}: CardEditorModalProps) {
	const [editingCardId, setEditingCardId] = useAtom(editingCardIdAtom)
	const dialogRef = useRef<HTMLDialogElement>(null)
	const card = editingCardId ? cards.find((c) => c.id === editingCardId) : null

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [criteria, setCriteria] = useState<string[]>([])
	const [taskType, setTaskType] = useState('feature')
	const [anatomyExpanded, setAnatomyExpanded] = useState(false)

	const [improving, setImproving] = useState(false)
	const [improveResult, setImproveResult] = useState<ImproveResult | null>(null)
	const [improveError, setImproveError] = useState<string | null>(null)
	const improvingRef = useRef(false)

	const anatomy = useMemo(() => parsePromptAnatomy(description), [description])

	useEffect(() => {
		if (card) {
			setTitle(card.title)
			setDescription(card.description ?? '')
			setCriteria(card.acceptanceCriteria ?? [])
			setTaskType(card.taskType)
			setImproveResult(null)
			setImproveError(null)
			setImproving(false)
		}
	}, [card])

	useEffect(() => {
		const dialog = dialogRef.current
		if (card && dialog && !dialog.open) {
			dialog.showModal()
		} else if (!card && dialog?.open) {
			dialog.close()
		}
	}, [card])

	const close = useCallback(() => {
		setEditingCardId(null)
	}, [setEditingCardId])

	const handleSave = () => {
		if (!card) return
		onSave(card.id, {
			title: title.trim(),
			description: description.trim() || null,
			acceptanceCriteria: criteria.filter((c) => c.trim().length > 0),
			taskType,
		})
		close()
	}

	const handleDelete = () => {
		if (!card) return
		onDelete(card.id)
		close()
	}

	const handleMarkReady = () => {
		if (!card) return
		onMarkReady(card.id)
		close()
	}

	const handleCriterionChange = (index: number, value: string) => {
		setCriteria((prev) => prev.map((c, i) => (i === index ? value : c)))
	}

	const handleAddCriterion = () => {
		setCriteria((prev) => [...prev, ''])
	}

	const handleRemoveCriterion = (index: number) => {
		setCriteria((prev) => prev.filter((_, i) => i !== index))
	}

	const handleImprove = useCallback(async () => {
		if (improvingRef.current || !description.trim()) return
		improvingRef.current = true
		setImproving(true)
		setImproveResult(null)
		setImproveError(null)

		try {
			const activeCriteria = criteria.filter((c) => c.trim().length > 0)
			const res = await fetch(`/api/workspace/${projectId}/improve-prompt`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: description.trim(),
					...(activeCriteria.length > 0 ? { acceptanceCriteria: activeCriteria } : {}),
				}),
			})

			if (!res.ok) {
				setImproveError('Could not improve this prompt. Try again.')
				return
			}

			const data = (await res.json()) as { improved: string; explanation: string }
			setImproveResult({
				original: description.trim(),
				improved: data.improved,
				explanation: data.explanation,
			})
		} catch {
			setImproveError('Network error. Check your connection and try again.')
		} finally {
			improvingRef.current = false
			setImproving(false)
		}
	}, [description, criteria, projectId])

	const handleAcceptImprovement = useCallback(() => {
		if (improveResult) {
			setDescription(improveResult.improved)
			setImproveResult(null)
		}
	}, [improveResult])

	const handleDismissImprovement = useCallback(() => {
		setImproveResult(null)
	}, [])

	const showMarkReady = card ? canTransition(card.state, 'ready') : false

	return (
		<styled.dialog
			ref={dialogRef}
			padding={0}
			borderRadius="xl"
			border="1px solid"
			borderColor="outlineVariant/20"
			background="surface"
			color="onSurface"
			maxWidth="560px"
			width="90vw"
			maxHeight="85vh"
			boxShadow="xl"
			overflowY="auto"
			_backdrop={{
				background: 'black/40',
			}}
			onCancel={() => close()}
		>
			<VStack alignItems="stretch" gap={0}>
				<Flex
					alignItems="center"
					justifyContent="space-between"
					paddingBlock={4}
					paddingInline={6}
					borderBlockEnd="1px solid"
					borderColor="outlineVariant/20"
				>
					<styled.h2 textStyle="body.lg" fontWeight="700">
						Edit subtask
					</styled.h2>
					<styled.button
						type="button"
						onClick={() => close()}
						padding={1}
						borderRadius="sm"
						color="onSurfaceVariant"
						cursor="pointer"
						transition="color 0.15s"
						_hover={{ color: 'onSurface' }}
						aria-label="Close editor"
					>
						<X size={18} />
					</styled.button>
				</Flex>

				<VStack alignItems="stretch" gap={4} padding={6}>
					<VStack alignItems="stretch" gap={1}>
						<styled.label
							htmlFor="card-editor-title"
							textStyle="body.xs"
							fontWeight="600"
							color="onSurfaceVariant"
						>
							Title
						</styled.label>
						<styled.input
							id="card-editor-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							paddingBlock={2}
							paddingInline={3}
							borderRadius="md"
							border="1px solid"
							borderColor="outlineVariant/50"
							background="surfaceContainerLowest"
							color="onSurface"
							textStyle="body.sm"
							_focus={{
								outline: 'none',
								borderColor: 'primary',
								boxShadow: '0 0 0 2px token(colors.primary/20)',
							}}
						/>
					</VStack>

					<VStack alignItems="stretch" gap={1}>
						<styled.label
							htmlFor="card-editor-desc"
							textStyle="body.xs"
							fontWeight="600"
							color="onSurfaceVariant"
						>
							Description
						</styled.label>
						<styled.textarea
							id="card-editor-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							paddingBlock={2}
							paddingInline={3}
							borderRadius="md"
							border="1px solid"
							borderColor="outlineVariant/50"
							background="surfaceContainerLowest"
							color="onSurface"
							textStyle="body.sm"
							resize="vertical"
							_focus={{
								outline: 'none',
								borderColor: 'primary',
								boxShadow: '0 0 0 2px token(colors.primary/20)',
							}}
						/>
					</VStack>

					<Flex gap={2} alignItems="center">
						<styled.button
							type="button"
							onClick={() => void handleImprove()}
							disabled={improving || !description.trim()}
							display="flex"
							alignItems="center"
							gap={1}
							background="transparent"
							textStyle="body.xs"
							color={improving || !description.trim() ? 'onSurfaceVariant/50' : 'primary'}
							cursor={improving || !description.trim() ? 'default' : 'pointer'}
							paddingBlock={0}
							paddingInline={0}
							_hover={improving || !description.trim() ? {} : { textDecoration: 'underline' }}
						>
							<Sparkles size={14} />
							{improving ? 'Improving...' : 'Improve this'}
						</styled.button>
						<styled.span textStyle="body.xs" color="onSurfaceVariant/50">
							1 token
						</styled.span>
					</Flex>

					{improveError && (
						<styled.p textStyle="body.xs" color="red.600">
							{improveError}
						</styled.p>
					)}

					{improveResult && (
						<ImproveSuggestion
							result={improveResult}
							onAccept={handleAcceptImprovement}
							onDismiss={handleDismissImprovement}
						/>
					)}

					<PromptAnatomySection
						anatomy={anatomy}
						expanded={anatomyExpanded}
						onToggle={() => setAnatomyExpanded((prev) => !prev)}
					/>

					<VStack alignItems="stretch" gap={1}>
						<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
							Acceptance criteria
						</styled.span>
						{criteria.map((criterion, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: stable list with add/remove only
							<Flex key={index} gap={2} alignItems="center">
								<styled.input
									type="text"
									value={criterion}
									onChange={(e) => handleCriterionChange(index, e.target.value)}
									flex="1"
									paddingBlock={1}
									paddingInline={3}
									borderRadius="md"
									border="1px solid"
									borderColor="outlineVariant/50"
									background="surfaceContainerLowest"
									color="onSurface"
									textStyle="body.sm"
									_focus={{
										outline: 'none',
										borderColor: 'primary',
									}}
								/>
								<styled.button
									type="button"
									onClick={() => handleRemoveCriterion(index)}
									padding={1}
									borderRadius="sm"
									color="onSurfaceVariant"
									cursor="pointer"
									_hover={{ color: 'red.600' }}
									aria-label={`Remove criterion ${index + 1}`}
								>
									<X size={14} />
								</styled.button>
							</Flex>
						))}
						<styled.button
							type="button"
							onClick={() => handleAddCriterion()}
							textStyle="body.xs"
							color="primary"
							cursor="pointer"
							background="transparent"
							paddingBlock={1}
							textAlign="start"
							_hover={{ textDecoration: 'underline' }}
						>
							+ Add criterion
						</styled.button>
					</VStack>

					<VStack alignItems="stretch" gap={1}>
						<styled.label
							htmlFor="card-editor-task-type"
							textStyle="body.xs"
							fontWeight="600"
							color="onSurfaceVariant"
						>
							Task type
						</styled.label>
						<styled.select
							id="card-editor-task-type"
							value={taskType}
							onChange={(e) => setTaskType(e.target.value)}
							paddingBlock={2}
							paddingInline={3}
							borderRadius="md"
							border="1px solid"
							borderColor="outlineVariant/50"
							background="surfaceContainerLowest"
							color="onSurface"
							textStyle="body.sm"
							cursor="pointer"
							_focus={{
								outline: 'none',
								borderColor: 'primary',
							}}
						>
							<option value="feature">Feature</option>
							<option value="page">Page</option>
							<option value="integration">Integration</option>
							<option value="data">Data</option>
							<option value="fix">Fix</option>
							<option value="polish">Polish</option>
						</styled.select>
					</VStack>

					{card?.explainerText && (
						<VStack alignItems="stretch" gap={1}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								What you will learn
							</styled.span>
							<styled.p
								textStyle="body.sm"
								color="onSurfaceVariant"
								fontStyle="italic"
								lineHeight="1.5"
							>
								{card.explainerText}
							</styled.p>
						</VStack>
					)}
				</VStack>

				<Flex
					gap={3}
					justifyContent="space-between"
					alignItems="center"
					paddingBlock={4}
					paddingInline={6}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/20"
				>
					<styled.button
						type="button"
						onClick={() => handleDelete()}
						display="flex"
						alignItems="center"
						gap={1}
						paddingBlock={2}
						paddingInline={3}
						borderRadius="md"
						background="transparent"
						color="red.600"
						textStyle="body.sm"
						cursor="pointer"
						_hover={{ background: 'red.50' }}
					>
						<Trash2 size={14} />
						Delete
					</styled.button>

					<Flex gap={2}>
						{showMarkReady && (
							<styled.button
								type="button"
								onClick={() => handleMarkReady()}
								paddingBlock={2}
								paddingInline={4}
								borderRadius="md"
								background="primary/10"
								color="primary"
								textStyle="body.sm"
								fontWeight="600"
								cursor="pointer"
								transition="background 0.15s"
								_hover={{ background: 'primary/20' }}
							>
								Mark ready
							</styled.button>
						)}
						<styled.button
							type="button"
							onClick={() => handleSave()}
							paddingBlock={2}
							paddingInline={4}
							borderRadius="md"
							background="primary"
							color="onPrimary"
							textStyle="body.sm"
							fontWeight="600"
							cursor="pointer"
							transition="opacity 0.15s"
							_hover={{ opacity: 0.9 }}
						>
							Save
						</styled.button>
					</Flex>
				</Flex>
			</VStack>
		</styled.dialog>
	)
}

const SEGMENT_SUGGESTIONS: Record<string, string> = {
	role: 'try adding who the AI should be',
	context: 'try adding what data to use',
	task: 'try adding what to do',
	constraints: 'try adding what to avoid',
	format: 'try specifying the output shape',
}

const SEGMENT_LABELS: Record<string, string> = {
	role: 'Role',
	context: 'Context',
	task: 'Task',
	constraints: 'Constraints',
	format: 'Format',
}

function truncate(text: string, max: number) {
	return text.length > max ? `${text.slice(0, max)}...` : text
}

function scoreColor(score: number) {
	if (score >= 5) return 'green.700'
	if (score >= 3) return 'green.600'
	return 'amber.600'
}

function scoreWeight(score: number): '700' | '600' {
	return score >= 5 ? '700' : '600'
}

type PromptAnatomySectionProps = {
	readonly anatomy: PromptAnatomy
	readonly expanded: boolean
	readonly onToggle: () => void
}

type ImproveSuggestionProps = {
	readonly result: ImproveResult
	readonly onAccept: () => void
	readonly onDismiss: () => void
}

function ImproveSuggestion({ result, onAccept, onDismiss }: ImproveSuggestionProps) {
	return (
		<Box background="surfaceContainerLow" borderRadius="md" paddingBlock={3} paddingInline={4}>
			<VStack alignItems="stretch" gap={2}>
				<Flex gap={4}>
					<VStack alignItems="stretch" gap={1} flex="1">
						<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
							Original
						</styled.span>
						<styled.p
							textStyle="body.sm"
							color="onSurfaceVariant"
							lineHeight="1.5"
							whiteSpace="pre-wrap"
						>
							{result.original}
						</styled.p>
					</VStack>
					<VStack alignItems="stretch" gap={1} flex="1">
						<styled.span textStyle="body.xs" fontWeight="600" color="green.700">
							Improved
						</styled.span>
						<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.5" whiteSpace="pre-wrap">
							{result.improved}
						</styled.p>
					</VStack>
				</Flex>

				<styled.p textStyle="body.xs" color="onSurfaceVariant" fontStyle="italic">
					{result.explanation}
				</styled.p>

				<Flex gap={2}>
					<styled.button
						type="button"
						onClick={() => onAccept()}
						paddingBlock={1}
						paddingInline={3}
						borderRadius="md"
						background="primary"
						color="onPrimary"
						textStyle="body.xs"
						fontWeight="600"
						cursor="pointer"
						_hover={{ opacity: 0.9 }}
					>
						Accept
					</styled.button>
					<styled.button
						type="button"
						onClick={() => onDismiss()}
						paddingBlock={1}
						paddingInline={3}
						borderRadius="md"
						background="transparent"
						color="onSurfaceVariant"
						textStyle="body.xs"
						fontWeight="600"
						cursor="pointer"
						_hover={{ color: 'onSurface' }}
					>
						Keep original
					</styled.button>
				</Flex>
			</VStack>
		</Box>
	)
}

function PromptAnatomySection({ anatomy, expanded, onToggle }: PromptAnatomySectionProps) {
	const foundByType = useMemo(() => {
		const map = new Map<string, string>()
		for (const seg of anatomy.segments) {
			map.set(seg.type, seg.text)
		}
		return map
	}, [anatomy.segments])

	return (
		<VStack alignItems="stretch" gap={2}>
			<styled.button
				type="button"
				onClick={() => onToggle()}
				display="flex"
				alignItems="center"
				gap={1}
				background="transparent"
				textStyle="body.xs"
				fontWeight="600"
				color="onSurfaceVariant"
				cursor="pointer"
				paddingBlock={0}
				paddingInline={0}
				_hover={{ color: 'onSurface' }}
				aria-expanded={expanded}
			>
				{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				Analyze prompt
			</styled.button>

			{expanded && (
				<Box background="surfaceContainerLow" borderRadius="md" paddingBlock={3} paddingInline={4}>
					<VStack alignItems="stretch" gap={1}>
						<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
							Your prompt has:
						</styled.span>

						{(['role', 'context', 'task', 'constraints', 'format'] as const).map((segment) => {
							const matched = foundByType.get(segment)
							return (
								<Flex key={segment} gap={2} alignItems="baseline" textStyle="body.xs">
									<styled.span flexShrink={0} color={matched ? 'green.600' : 'onSurfaceVariant'}>
										{matched ? '\u2713' : '\u2717'}
									</styled.span>
									<styled.span flexShrink={0} fontWeight="500" color="onSurface" minWidth="80px">
										{SEGMENT_LABELS[segment]}
									</styled.span>
									{matched ? (
										<styled.span color="primary">&ldquo;{truncate(matched, 40)}&rdquo;</styled.span>
									) : (
										<styled.span color="onSurfaceVariant" fontStyle="italic">
											&mdash; {SEGMENT_SUGGESTIONS[segment]}
										</styled.span>
									)}
								</Flex>
							)
						})}

						<styled.span
							role="status"
							textStyle="body.xs"
							fontWeight={scoreWeight(anatomy.score)}
							color={scoreColor(anatomy.score)}
							marginBlockStart={1}
						>
							Prompt score: {anatomy.score}/5
						</styled.span>
					</VStack>
				</Box>
			)}
		</VStack>
	)
}
