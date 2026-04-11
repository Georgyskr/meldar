'use client'

import type { ResolvedWishes } from '@meldar/orchestrator'
import { css } from '@styled-system/css'
import { Box, Flex, VStack } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { ProposalCard } from '@/features/glass-plan'
import { Text } from '@/shared/ui'

type Phase = 'idle' | 'proposing' | 'proposal-ready' | 'generating' | 'ready' | 'failed'

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

const chipStyle = css({
	paddingBlock: '2',
	paddingInline: '4',
	borderRadius: 'full',
	border: '1px solid',
	borderColor: 'outlineVariant',
	background: 'transparent',
	color: 'onSurfaceVariant',
	fontFamily: 'body',
	fontSize: 'sm',
	cursor: 'pointer',
	transition: 'all 0.15s',
	_hover: { borderColor: 'primary', color: 'primary', background: 'primary/4' },
})

const inputStyle = css({
	flex: '1',
	paddingBlock: '3',
	paddingInline: '4',
	borderRadius: 'lg',
	border: '1px solid',
	borderColor: 'outlineVariant',
	background: 'surface',
	color: 'onSurface',
	fontFamily: 'body',
	fontSize: 'md',
	outline: 'none',
	_focus: { borderColor: 'primary' },
})

const sendButton = css({
	paddingBlock: '3',
	paddingInline: '4',
	borderRadius: 'lg',
	background: 'primary',
	color: 'white',
	border: 'none',
	cursor: 'pointer',
	fontFamily: 'heading',
	fontWeight: '600',
	fontSize: 'sm',
	_hover: { opacity: 0.9 },
	_disabled: { opacity: 0.5, cursor: 'not-allowed' },
})

export function OnboardingChat({ projectId }: { readonly projectId: string }) {
	const router = useRouter()
	const [phase, setPhase] = useState<Phase>('idle')
	const [draft, setDraft] = useState('')
	const [proposal, setProposal] = useState<ResolvedWishes | null>(null)
	const [description, setDescription] = useState('')
	const [error, setError] = useState<string | null>(null)
	const inFlight = useRef(false)

	const handleTemplateChip = useCallback(
		async (templateId: string) => {
			if (inFlight.current) return
			inFlight.current = true
			setPhase('generating')
			try {
				const res = await fetch(`/api/workspace/${projectId}/apply-template`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ templateId }),
				})
				if (!res.ok) throw new Error('Template apply failed')
				router.refresh()
			} catch {
				setError('Could not apply template. Try again.')
				setPhase('failed')
			} finally {
				inFlight.current = false
			}
		},
		[projectId, router],
	)

	const handleSubmit = useCallback(async () => {
		const text = draft.trim()
		if (!text || inFlight.current) return
		inFlight.current = true
		setDescription(text)
		setDraft('')
		setPhase('proposing')
		setError(null)

		try {
			const res = await fetch(`/api/workspace/${projectId}/generate-proposal`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description: text }),
			})
			if (!res.ok) throw new Error('Proposal generation failed')
			const data = (await res.json()) as { proposal: ResolvedWishes }
			setProposal(data.proposal)
			setPhase('proposal-ready')
		} catch {
			setError('Could not generate a proposal. Try again.')
			setPhase('failed')
		} finally {
			inFlight.current = false
		}
	}, [draft, projectId])

	const handleApprove = useCallback(async () => {
		if (!proposal || inFlight.current) return
		inFlight.current = true
		setPhase('generating')

		try {
			await fetch(`/api/workspace/${projectId}/wishes`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					originalDescription: description,
					proposal,
					approvedAt: new Date().toISOString(),
				}),
			})

			const planRes = await fetch(`/api/workspace/${projectId}/generate-plan`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: [{ role: 'user', content: description }] }),
			})
			if (!planRes.ok) throw new Error('Plan generation failed')
			setPhase('ready')
			router.refresh()
		} catch {
			setError('Could not create your plan. Try again.')
			setPhase('failed')
		} finally {
			inFlight.current = false
		}
	}, [proposal, description, projectId, router])

	const handleStartOver = useCallback(() => {
		setPhase('idle')
		setProposal(null)
		setDescription('')
		setError(null)
		setDraft('')
	}, [])

	return (
		<VStack
			gap="6"
			maxWidth="560px"
			marginInline="auto"
			paddingBlock="12"
			paddingInline="6"
			height="100%"
			justifyContent="center"
		>
			<Text textStyle="primary.lg" color="onSurface" textAlign="center">
				Hey. Tell me what you want to build.
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
				Describe it in a sentence — or pick one of these.
			</Text>

			{phase === 'idle' && (
				<>
					<Flex flexWrap="wrap" gap="2" justifyContent="center">
						{TEMPLATE_CHIPS.map((chip) => (
							<button
								key={chip.templateId}
								type="button"
								className={chipStyle}
								onClick={() => handleTemplateChip(chip.templateId)}
							>
								{chip.label}
							</button>
						))}
					</Flex>

					<Flex gap="2" width="100%">
						<input
							className={inputStyle}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="e.g. photography portfolio, dark theme"
							aria-label="Describe what you want to build"
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleSubmit()
							}}
						/>
						<button
							type="button"
							className={sendButton}
							onClick={handleSubmit}
							disabled={!draft.trim()}
						>
							Go
						</button>
					</Flex>
				</>
			)}

			{phase === 'proposing' && (
				<Text
					textStyle="secondary.sm"
					color="onSurfaceVariant"
					textAlign="center"
					aria-live="polite"
				>
					Thinking about your app...
				</Text>
			)}

			{phase === 'proposal-ready' && proposal && (
				<ProposalCard wishes={proposal} onApprove={handleApprove} onEdit={handleStartOver} />
			)}

			{phase === 'generating' && (
				<Text
					textStyle="secondary.sm"
					color="onSurfaceVariant"
					textAlign="center"
					aria-live="polite"
				>
					Setting up your plan...
				</Text>
			)}

			{phase === 'failed' && error && (
				<VStack gap="3" alignItems="center">
					<Box
						paddingBlock="3"
						paddingInline="5"
						borderRadius="lg"
						background="error/8"
						border="1px solid"
						borderColor="error/20"
					>
						<Text textStyle="secondary.sm" color="error">
							{error}
						</Text>
					</Box>
					<button type="button" className={chipStyle} onClick={handleStartOver}>
						Start over
					</button>
				</VStack>
			)}
		</VStack>
	)
}
