'use client'

import { TEMPLATE_SUMMARIES, type TemplateSummary } from '@meldar/orchestrator'
import { Box, Flex, Grid, HStack, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Lightbulb, ListChecks, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { TokenBalancePill } from '@/features/token-economy'
import { Heading, Text } from '@/shared/ui'
import { TemplatePreviewDrawer } from './TemplatePreviewDrawer'

export type FirstTimeWelcomeProps = {
	readonly email: string
	readonly tokenBalance: number
}

const createProjectResponseSchema = z.object({
	projectId: z.string().uuid(),
})

async function createProject(name: string): Promise<string> {
	const res = await fetch('/api/workspace/projects', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name }),
	})
	if (!res.ok) {
		let message = `Could not create project (${res.status})`
		try {
			const json = (await res.json()) as { error?: { message?: string } }
			if (json.error?.message) message = json.error.message
		} catch {
			// response body wasn't valid JSON; fall through with default message
		}
		throw new Error(message)
	}
	const parsed = createProjectResponseSchema.safeParse(await res.json())
	if (!parsed.success) throw new Error('Server returned an unexpected response')
	return parsed.data.projectId
}

async function applyTemplate(projectId: string, templateId: string): Promise<void> {
	const res = await fetch(`/api/workspace/${projectId}/apply-template`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ templateId }),
	})
	if (!res.ok) {
		const data = (await res.json()) as { error?: { message?: string } }
		throw new Error(data.error?.message ?? `HTTP ${res.status}`)
	}
}

type Status = 'idle' | 'creating'

type Goal = 'learning' | 'work' | 'exploring'

const PLACEHOLDERS = [
	'A client booking page with calendar...',
	"A dashboard to track my team's progress...",
	'An expense tracker with charts...',
	'A feedback form for my clients...',
	'An inventory management tool...',
]

const CATEGORY_EMOJI: Record<string, string> = {
	chart: '\u{1F4CA}',
	dashboard: '\u{1F4CA}',
	form: '\u{1F4DD}',
	table: '\u{1F4CB}',
	page: '\u{1F310}',
	'email-sender': '\u{1F4E7}',
}

function getCategoryEmoji(template: TemplateSummary): string {
	for (const tag of template.tags) {
		if (CATEGORY_EMOJI[tag]) return CATEGORY_EMOJI[tag]
	}
	return '\u{1F4CA}'
}

const WORK_TEMPLATE_IDS = new Set(['team-status-board', 'meeting-action-items', 'task-manager'])

function sortTemplates(templates: TemplateSummary[], goal: Goal): TemplateSummary[] {
	if (goal === 'exploring') return templates
	if (goal === 'work') {
		return [...templates].sort((a, b) => {
			const aWork = WORK_TEMPLATE_IDS.has(a.id) ? 0 : 1
			const bWork = WORK_TEMPLATE_IDS.has(b.id) ? 0 : 1
			return aWork - bWork
		})
	}
	return [...templates].sort((a, b) => {
		const aScore = a.milestoneCount + a.tags.length
		const bScore = b.milestoneCount + b.tags.length
		return bScore - aScore
	})
}

function formatDifficulty(difficulty: TemplateSummary['difficulty']): string {
	if (difficulty === 'beginner') return 'Beginner'
	if (difficulty === 'intermediate') return 'Intermediate'
	return 'Advanced'
}

export function FirstTimeWelcome({ email, tokenBalance }: FirstTimeWelcomeProps) {
	const router = useRouter()
	const inFlight = useRef(false)
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)
	const [freeformValue, setFreeformValue] = useState('')
	const [selectedGoal, setSelectedGoal] = useState<Goal>('exploring')
	const [placeholderIndex, setPlaceholderIndex] = useState(0)

	useEffect(() => {
		const interval = setInterval(() => {
			setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
		}, 3000)
		return () => {
			clearInterval(interval)
		}
	}, [])

	const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

	const sortedTemplates = useMemo(
		() => sortTemplates(TEMPLATE_SUMMARIES, selectedGoal),
		[selectedGoal],
	)

	const handleTemplateClick = useCallback((templateId: string) => {
		setPreviewTemplateId(templateId)
	}, [])

	const handlePreviewStart = useCallback(
		async (templateId: string, templateName: string) => {
			if (inFlight.current) return
			inFlight.current = true
			setStatus('creating')
			setError(null)
			setPreviewTemplateId(null)
			try {
				const projectId = await createProject(templateName)
				try {
					await applyTemplate(projectId, templateId)
				} catch (err) {
					console.warn('[FirstTimeWelcome] applyTemplate failed, continuing:', err)
				}
				router.push(`/workspace/${projectId}`)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Something went wrong')
				setStatus('idle')
			} finally {
				inFlight.current = false
			}
		},
		[router],
	)

	const handlePreviewClose = useCallback(() => {
		setPreviewTemplateId(null)
	}, [])

	const handleFreeformSubmit = useCallback(async () => {
		const trimmed = freeformValue.trim()
		if (inFlight.current || !trimmed) return
		inFlight.current = true
		setStatus('creating')
		setError(null)
		try {
			const projectId = await createProject(trimmed)
			router.push(`/workspace/${projectId}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setStatus('idle')
		} finally {
			inFlight.current = false
		}
	}, [router, freeformValue])

	const busy = status !== 'idle'
	const displayName = email.split('@')[0]

	return (
		<VStack alignItems="stretch" gap={8} maxWidth="720px" marginInline="auto">
			<Box borderBottom="2px solid" borderColor="onSurface" paddingBlockEnd={6}>
				<Heading textStyle="primary.lg" color="onSurface">
					Your first app, {displayName}
				</Heading>
			</Box>

			<VStack alignItems="stretch" gap={3}>
				<Text as="p" textStyle="tertiary.sm" color="primary">
					§ I — What brings you here?
				</Text>
				<Flex gap={2} flexWrap="wrap">
					{(
						[
							{ value: 'learning', label: 'Learning AI' },
							{ value: 'work', label: 'Making for work' },
							{ value: 'exploring', label: 'Just exploring' },
						] as const
					).map((goal) => (
						<styled.button
							key={goal.value}
							type="button"
							onClick={() => setSelectedGoal(goal.value)}
							paddingInline={4}
							paddingBlock={2}
							border="1.5px solid"
							borderColor={selectedGoal === goal.value ? 'primary' : 'onSurface/20'}
							bg={selectedGoal === goal.value ? 'primary/6' : 'transparent'}
							color="onSurface"
							cursor="pointer"
							transition="all 0.15s"
							_hover={{ borderColor: 'primary/50' }}
						>
							<Text
								textStyle="primary.xs"
								color={selectedGoal === goal.value ? 'primary' : 'onSurface'}
							>
								{goal.label}
							</Text>
						</styled.button>
					))}
				</Flex>
			</VStack>

			<VStack alignItems="stretch" gap={3}>
				<Text as="p" textStyle="tertiary.sm" color="primary">
					§ II — Pick a template
				</Text>
				<Grid
					gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
					gap={0}
				>
					{sortedTemplates.map((template, i) => (
						<styled.button
							key={template.id}
							type="button"
							onClick={() => handleTemplateClick(template.id)}
							disabled={busy}
							textAlign="left"
							paddingBlock={5}
							paddingInline={5}
							border="1px solid"
							borderColor="onSurface/15"
							bg="surface"
							cursor={busy ? 'wait' : 'pointer'}
							transition="all 0.15s"
							_hover={{
								bg: 'primary/3',
								borderColor: 'onSurface/40',
							}}
							_disabled={{ opacity: 0.5 }}
						>
							<VStack alignItems="flex-start" gap={2}>
								<Flex justifyContent="space-between" width="100%" alignItems="baseline">
									<Text textStyle="tertiary.sm" color="primary">
										Nº {String(i + 1).padStart(2, '0')}
									</Text>
									<Text textStyle="tertiary.sm" color="onSurfaceVariant/50">
										{formatDifficulty(template.difficulty)}
									</Text>
								</Flex>
								<Text textStyle="primary.xs" color="onSurface">
									{getCategoryEmoji(template)} {template.name}
								</Text>
								<Text textStyle="secondary.xs" color="onSurfaceVariant">
									{template.description}
								</Text>

								{template.learningHighlights.length > 0 && (
									<VStack alignItems="flex-start" gap={0.5} width="100%">
										<Text textStyle="italic.sm" color="onSurfaceVariant/80">
											What you'll add:
										</Text>
										{template.learningHighlights.slice(0, 2).map((highlight) => (
											<Text key={highlight} textStyle="secondary.xs" color="onSurfaceVariant/70">
												&bull; {highlight}
											</Text>
										))}
									</VStack>
								)}

								<Text textStyle="tertiary.sm" color="onSurfaceVariant/50">
									~{template.estimatedMinutes} min · {template.estimatedTokens} tokens
								</Text>
							</VStack>
						</styled.button>
					))}
				</Grid>
			</VStack>

			<VStack alignItems="stretch" gap={2}>
				<Text as="p" textStyle="tertiary.sm" color="primary">
					§ III — Or describe what you want
				</Text>
				<Flex gap={2}>
					<styled.input
						type="text"
						value={freeformValue}
						onChange={(e) => setFreeformValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleFreeformSubmit()
						}}
						placeholder={PLACEHOLDERS[placeholderIndex]}
						disabled={busy}
						aria-label="Describe what you want to build"
						flex="1"
						paddingBlock={2.5}
						paddingInline={4}
						border="1px solid"
						borderColor="onSurface/20"
						bg="surface"
						color="onSurface"
						textStyle="secondary.sm"
						transition="border-color 0.15s"
						_focus={{ borderColor: 'primary', outline: 'none' }}
						_disabled={{ opacity: 0.5 }}
						_placeholder={{ color: 'onSurfaceVariant/50' }}
					/>
					<styled.button
						type="button"
						onClick={() => handleFreeformSubmit()}
						disabled={busy || !freeformValue.trim()}
						paddingInline={4}
						paddingBlock={2.5}
						border="none"
						bg="onSurface"
						color="surface"
						cursor={busy ? 'wait' : 'pointer'}
						opacity={busy || !freeformValue.trim() ? 0.5 : 1}
						transition="all 0.15s"
						_hover={{ bg: 'primary', opacity: busy || !freeformValue.trim() ? 0.5 : 1 }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
						aria-label="Submit"
					>
						<ArrowRight size={18} color="white" />
					</styled.button>
				</Flex>
			</VStack>

			{error && (
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
			)}

			<Box borderBlockStart="2px solid" borderColor="onSurface" paddingBlockStart={6}>
				<Text as="p" textStyle="tertiary.sm" color="primary" marginBlockEnd={4}>
					How it works
				</Text>
				<Grid gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={0}>
					{[
						{
							icon: Lightbulb,
							number: '01',
							title: 'Pick or describe',
							desc: 'Choose a template or tell us what you want',
						},
						{
							icon: ListChecks,
							number: '02',
							title: 'We plan it',
							desc: 'AI breaks it into milestones',
						},
						{
							icon: Rocket,
							number: '03',
							title: 'Watch it happen',
							desc: 'Click Start, see your app appear',
						},
					].map((item) => (
						<HStack
							key={item.number}
							gap={3}
							alignItems="flex-start"
							paddingBlock={4}
							paddingInline={4}
							border="1px solid"
							borderColor="onSurface/10"
						>
							<Box flexShrink={0} marginBlockStart={0.5}>
								<item.icon size={16} color="#623153" strokeWidth={1.5} />
							</Box>
							<VStack alignItems="flex-start" gap={0.5}>
								<Text textStyle="primary.xs" color="onSurface">
									{item.title}
								</Text>
								<Text textStyle="secondary.xs" color="onSurfaceVariant/70">
									{item.desc}
								</Text>
							</VStack>
						</HStack>
					))}
				</Grid>
			</Box>

			<VStack alignItems="center" gap={1}>
				<TokenBalancePill balance={tokenBalance} />
				<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/60" textAlign="center">
					Enough for 2-3 complete apps · Your first app is free
				</Text>
			</VStack>

			<TemplatePreviewDrawer
				templateId={previewTemplateId}
				tokenBalance={tokenBalance}
				estimatedTokens={
					TEMPLATE_SUMMARIES.find((s) => s.id === previewTemplateId)?.estimatedTokens
				}
				onStart={handlePreviewStart}
				onClose={handlePreviewClose}
			/>
		</VStack>
	)
}
