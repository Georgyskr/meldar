'use client'

import { Flex, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { canTransition } from '../model/card-state-machine'
import { editingCardIdAtom } from '../model/kanban-atoms'

export type CardEditorModalProps = {
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

export function CardEditorModal({ cards, onSave, onDelete, onMarkReady }: CardEditorModalProps) {
	const [editingCardId, setEditingCardId] = useAtom(editingCardIdAtom)
	const dialogRef = useRef<HTMLDialogElement>(null)
	const card = editingCardId ? cards.find((c) => c.id === editingCardId) : null

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [criteria, setCriteria] = useState<string[]>([])
	const [taskType, setTaskType] = useState('feature')

	useEffect(() => {
		if (card) {
			setTitle(card.title)
			setDescription(card.description ?? '')
			setCriteria(card.acceptanceCriteria ?? [])
			setTaskType(card.taskType)
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
