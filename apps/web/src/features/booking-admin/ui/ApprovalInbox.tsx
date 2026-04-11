'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import { CheckCircle, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button, Heading, Text, toast } from '@/shared/ui'

type AgentTask = {
	readonly id: string
	readonly description: string
	readonly preview: string
	readonly status: 'proposed' | 'approved' | 'rejected'
	readonly createdAt: string
}

type Props = {
	readonly projectId: string
}

export function ApprovalInbox({ projectId }: Props) {
	const [tasks, setTasks] = useState<AgentTask[]>([])
	const [loading, setLoading] = useState(true)
	const [actingOn, setActingOn] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const res = await fetch(`/api/workspace/${projectId}/agent/tasks`)
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const data = (await res.json()) as { tasks: AgentTask[] }
				if (!cancelled) {
					setTasks(data.tasks.filter((t) => t.status === 'proposed'))
				}
			} catch (err) {
				if (!cancelled) {
					toast.error(
						'Could not load tasks',
						err instanceof Error ? err.message : 'Please refresh.',
					)
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [projectId])

	const handleAction = useCallback(
		async (taskId: string, action: 'approve' | 'reject') => {
			setActingOn(taskId)
			try {
				const res = await fetch(`/api/workspace/${projectId}/agent/tasks`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ taskId, action }),
				})

				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						error?: { message?: string }
					}
					throw new Error(body.error?.message ?? `Request failed (${res.status})`)
				}

				setTasks((prev) => prev.filter((t) => t.id !== taskId))
				toast.success(action === 'approve' ? 'Approved' : 'Rejected')
			} catch (err) {
				toast.error('Action failed', err instanceof Error ? err.message : 'Please try again.')
			} finally {
				setActingOn(null)
			}
		},
		[projectId],
	)

	if (loading) {
		return (
			<Box paddingBlock={6}>
				<Text textStyle="body.sm" color="onSurfaceVariant">
					Loading pending actions...
				</Text>
			</Box>
		)
	}

	if (tasks.length === 0) {
		return (
			<Box
				paddingBlock={8}
				paddingInline={6}
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/30"
				borderRadius="lg"
				textAlign="center"
			>
				<VStack alignItems="center" gap={2}>
					<CheckCircle size={24} color="var(--colors-on-surface-variant)" aria-hidden="true" />
					<Text textStyle="body.md" color="onSurfaceVariant">
						No pending approvals. Your AI receptionist is all caught up.
					</Text>
				</VStack>
			</Box>
		)
	}

	return (
		<VStack alignItems="stretch" gap={3}>
			{tasks.map((task) => {
				const isActing = actingOn === task.id
				return (
					<Box
						key={task.id}
						paddingBlock={5}
						paddingInline={6}
						background="surface"
						border="1px solid"
						borderColor="outlineVariant/30"
						borderRadius="lg"
					>
						<VStack alignItems="stretch" gap={4}>
							<VStack alignItems="stretch" gap={1}>
								<Text textStyle="label.sm" color="onSurfaceVariant">
									Your AI wants to
								</Text>
								<Heading as="h3" textStyle="heading.4" color="onSurface">
									{task.description}
								</Heading>
							</VStack>

							<Box
								paddingBlock={4}
								paddingInline={5}
								background="surfaceContainerLowest"
								border="1px solid"
								borderColor="outlineVariant/20"
								borderRadius="md"
								whiteSpace="pre-wrap"
							>
								<Text textStyle="body.sm" color="onSurface">
									{task.preview}
								</Text>
							</Box>

							<HStack gap={3}>
								<Button
									type="button"
									variant="solid"
									size="md"
									disabled={isActing}
									onClick={() => handleAction(task.id, 'approve')}
								>
									Approve
								</Button>
								<styled.button
									type="button"
									disabled={isActing}
									onClick={() => handleAction(task.id, 'reject')}
									display="inline-flex"
									alignItems="center"
									gap={2}
									minHeight="44px"
									paddingBlock={2.5}
									paddingInline={4}
									background="transparent"
									color="onSurface"
									border="1px solid"
									borderColor="outlineVariant/50"
									borderRadius="md"
									cursor="pointer"
									transition="all 0.15s"
									_hover={{ background: 'onSurface/4' }}
									_disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
									_focusVisible={{
										outline: '2px solid',
										outlineColor: 'primary',
										outlineOffset: '2px',
									}}
								>
									<XCircle size={16} aria-hidden="true" />
									<Text as="span" textStyle="button.md" color="onSurface">
										Reject
									</Text>
								</styled.button>
							</HStack>
						</VStack>
					</Box>
				)
			})}
		</VStack>
	)
}
