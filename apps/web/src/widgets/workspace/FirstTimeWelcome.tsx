'use client'

import { TEMPLATE_SUMMARIES, type TemplateSummary } from '@meldar/orchestrator'
import { Box, Flex, Grid, HStack, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Lightbulb, ListChecks, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { TokenBalancePill } from '@/features/token-economy'
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
			<styled.h2
				fontFamily="heading"
				fontSize={{ base: '2xl', md: '3xl' }}
				fontWeight="700"
				letterSpacing="-0.02em"
				color="onSurface"
			>
				Let's build your first app, {displayName}
			</styled.h2>

			<VStack alignItems="stretch" gap={3}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					What brings you here?
				</styled.p>
				<Flex gap={2} flexWrap="wrap">
					{(
						[
							{ value: 'learning', label: '\u{1F393} Learning AI' },
							{ value: 'work', label: '\u{1F3E2} Building for work' },
							{ value: 'exploring', label: '\u{1F50D} Just exploring' },
						] as const
					).map((goal) => (
						<styled.button
							key={goal.value}
							type="button"
							onClick={() => setSelectedGoal(goal.value)}
							paddingInline={4}
							paddingBlock={2}
							borderRadius="full"
							border="2px solid"
							borderColor={selectedGoal === goal.value ? 'transparent' : 'outlineVariant/50'}
							background={selectedGoal === goal.value ? 'transparent' : 'surfaceContainerLowest'}
							color={selectedGoal === goal.value ? 'onSurface' : 'onSurfaceVariant'}
							fontWeight={selectedGoal === goal.value ? '600' : '400'}
							textStyle="body.sm"
							cursor="pointer"
							transition="all 0.15s"
							style={
								selectedGoal === goal.value
									? {
											backgroundImage:
												'linear-gradient(#faf9f6, #faf9f6), linear-gradient(135deg, #623153 0%, #FFB876 100%)',
											backgroundOrigin: 'border-box',
											backgroundClip: 'padding-box, border-box',
										}
									: undefined
							}
							_hover={{ borderColor: 'primary/50' }}
						>
							{goal.label}
						</styled.button>
					))}
				</Flex>
			</VStack>

			<VStack alignItems="stretch" gap={3}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					Pick a template to get started:
				</styled.p>
				<Grid
					gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
					gap={3}
				>
					{sortedTemplates.map((template) => (
						<styled.button
							key={template.id}
							type="button"
							onClick={() => handleTemplateClick(template.id)}
							disabled={busy}
							textAlign="left"
							paddingBlock={4}
							paddingInline={5}
							borderRadius="lg"
							border="1px solid"
							borderColor="outlineVariant/50"
							bg="surfaceContainerLowest"
							cursor={busy ? 'wait' : 'pointer'}
							transition="all 0.15s"
							_hover={{
								borderColor: 'primary',
								background: 'primary/5',
								transform: 'translateY(-2px)',
								boxShadow: '0 4px 12px rgba(98,49,83,0.08)',
							}}
							_disabled={{ opacity: 0.5 }}
						>
							<VStack alignItems="flex-start" gap={2}>
								<styled.span
									textStyle="body.sm"
									fontWeight="600"
									fontFamily="heading"
									color="onSurface"
								>
									{getCategoryEmoji(template)} {template.name}
								</styled.span>
								<styled.span textStyle="body.xs" color="onSurfaceVariant">
									{template.description}
								</styled.span>

								{template.learningHighlights.length > 0 && (
									<VStack alignItems="flex-start" gap={0.5} width="100%">
										<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant/80">
											You'll learn:
										</styled.span>
										{template.learningHighlights.slice(0, 2).map((highlight) => (
											<styled.span key={highlight} textStyle="body.xs" color="onSurfaceVariant/70">
												&bull; {highlight}
											</styled.span>
										))}
									</VStack>
								)}

								<styled.span textStyle="body.xs" color="onSurfaceVariant/60">
									{formatDifficulty(template.difficulty)} &middot; ~{template.estimatedMinutes} min
									&middot; {template.estimatedTokens} tokens
								</styled.span>

								<Flex gap={1} flexWrap="wrap">
									{template.tags.map((tag) => (
										<styled.span
											key={tag}
											textStyle="body.xs"
											color="onSurfaceVariant/70"
											paddingInline={1.5}
											paddingBlock={0.5}
											borderRadius="sm"
											bg="surfaceContainer"
											fontSize="10px"
											lineHeight="1.2"
										>
											#{tag}
										</styled.span>
									))}
								</Flex>
							</VStack>
						</styled.button>
					))}
				</Grid>
			</VStack>

			<VStack alignItems="stretch" gap={2}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					Or describe what you want:
				</styled.p>
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
						flex="1"
						paddingBlock={2.5}
						paddingInline={4}
						borderRadius="md"
						border="1px solid"
						borderColor="outlineVariant/50"
						bg="surfaceContainerLowest"
						color="onSurface"
						textStyle="body.sm"
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
						borderRadius="md"
						border="none"
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						fontWeight="600"
						fontSize="sm"
						cursor={busy ? 'wait' : 'pointer'}
						opacity={busy || !freeformValue.trim() ? 0.5 : 1}
						transition="opacity 0.15s"
						_hover={{ opacity: busy || !freeformValue.trim() ? 0.5 : 0.9 }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
						aria-label="Submit"
					>
						<ArrowRight size={18} />
					</styled.button>
				</Flex>
			</VStack>

			{error && (
				<Box paddingBlock={2} paddingInline={3} borderRadius="md" background="error/10">
					<styled.p role="alert" textStyle="body.xs" color="error">
						{error}
					</styled.p>
				</Box>
			)}

			<Box borderBlockStart="1px solid" borderColor="outlineVariant/20" paddingBlockStart={6}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant/70" marginBlockEnd={4}>
					How it works:
				</styled.p>
				<Grid gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4}>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<Lightbulb size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								1. Pick or describe
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								Choose a template or tell us what you want
							</styled.span>
						</VStack>
					</HStack>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<ListChecks size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								2. We plan it
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								AI breaks it into milestones
							</styled.span>
						</VStack>
					</HStack>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<Rocket size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								3. Build with AI
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								Click Build, watch it happen
							</styled.span>
						</VStack>
					</HStack>
				</Grid>
			</Box>

			<VStack alignItems="center" gap={1}>
				<TokenBalancePill balance={tokenBalance} />
				<styled.p textStyle="body.xs" color="onSurfaceVariant/60" textAlign="center">
					Enough for 2-3 complete apps &middot; Your first app is free
				</styled.p>
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
