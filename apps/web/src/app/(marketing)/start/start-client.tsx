'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { RESET } from 'jotai/utils'
import { RefreshCw } from 'lucide-react'
import { useRef, useState } from 'react'
import {
	AdaptiveFollowUp,
	type AdaptiveFollowUpItem,
	AnalysisResults,
	adaptiveAnswersAtom,
	adaptiveFollowUpsAtom,
	analysisAtom,
	DataUploadHub,
	type ProfileData,
	phaseAtom,
	profileDataAtom,
	QuickProfile,
	sessionIdAtom,
	terminateOcr,
	uploadStatusAtom,
} from '@/features/discovery-flow'

export function StartClient() {
	const [phase, setPhase] = useAtom(phaseAtom)
	const [sessionId, setSessionId] = useAtom(sessionIdAtom)
	const [profileData, setProfileData] = useAtom(profileDataAtom)
	const [analysis, setAnalysis] = useAtom(analysisAtom)
	const [, setUploadStatus] = useAtom(uploadStatusAtom)
	const [adaptiveFollowUps, setAdaptiveFollowUps] = useAtom(adaptiveFollowUpsAtom)
	const [, setAdaptiveAnswers] = useAtom(adaptiveAnswersAtom)

	const [transitioning, setTransitioning] = useState(false)
	const [error, setError] = useState('')
	const [analyzing, setAnalyzing] = useState(false)

	const phaseContainerRef = useRef<HTMLDivElement>(null)

	const isResuming = profileData !== null && phase !== 'profile'

	function focusPhaseContainer() {
		requestAnimationFrame(() => {
			if (!phaseContainerRef.current) return
			const heading = phaseContainerRef.current.querySelector('h1, h2, h3, [tabindex]')
			if (heading instanceof HTMLElement) {
				heading.focus({ preventScroll: true })
			} else {
				phaseContainerRef.current.focus({ preventScroll: true })
			}
		})
	}

	function transitionTo(next: 'profile' | 'data' | 'adaptive' | 'results') {
		setTransitioning(true)
		setTimeout(() => {
			setPhase(next)
			setTransitioning(false)
			focusPhaseContainer()
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}, 300)
	}

	function handleStartFresh() {
		setSessionId(RESET)
		setPhase(RESET)
		setProfileData(RESET)
		setAnalysis(RESET)
		setUploadStatus(RESET)
		setAdaptiveFollowUps(RESET)
		setAdaptiveAnswers(RESET)
		setError('')
		transitionTo('profile')
	}

	function handleProfileComplete(data: ProfileData) {
		// Quiz data stays in localStorage only — no network call until user opts in and uploads
		setProfileData(data)
		transitionTo('data')
	}

	/** Create session in Neon lazily — called on first upload after user opts in */
	async function ensureSession(): Promise<string | null> {
		if (sessionId) return sessionId

		const profile = profileData
		if (!profile) return null

		try {
			const res = await fetch('/api/discovery/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					occupation: profile.occupation,
					customOccupation: profile.customOccupation,
					ageBracket: profile.ageBracket,
					quizPicks: profile.painPicks,
					customPain: profile.customPain,
					aiComfort: profile.aiComfort,
					aiToolsUsed: profile.aiToolsUsed,
				}),
			})

			if (!res.ok) {
				setError('Failed to save your answers. Please try again.')
				return null
			}

			const { sessionId: newSessionId } = await res.json()
			setSessionId(newSessionId)
			return newSessionId
		} catch {
			setError('Connection failed. Please try again.')
			return null
		}
	}

	async function handleRequestResults() {
		setAnalyzing(true)
		setError('')

		try {
			const sid = sessionId || (await ensureSession())
			if (!sid) {
				setError('Failed to create session. Please try again.')
				setAnalyzing(false)
				return
			}

			// First, check for adaptive follow-ups
			const adaptiveRes = await fetch('/api/discovery/adaptive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: sid }),
			})

			if (adaptiveRes.ok) {
				const adaptiveData = await adaptiveRes.json()
				const followUps: AdaptiveFollowUpItem[] = adaptiveData.followUps ?? []

				if (followUps.length > 0) {
					setAdaptiveFollowUps(followUps)
					setAnalyzing(false)
					transitionTo('adaptive')
					return
				}
			}

			// No follow-ups (or adaptive failed) — go straight to analysis
			await runAnalysis()
		} catch {
			setError('Connection failed. Please try again.')
			setAnalyzing(false)
		}
	}

	async function runAnalysis(adaptiveAnswers?: Record<string, string>) {
		setAnalyzing(true)
		setError('')

		try {
			const sid = sessionId || (await ensureSession())
			if (!sid) {
				setError('Failed to create session. Please try again.')
				setAnalyzing(false)
				return
			}

			const payload: Record<string, unknown> = { sessionId: sid }
			if (adaptiveAnswers && Object.keys(adaptiveAnswers).length > 0) {
				payload.adaptiveAnswers = adaptiveAnswers
			}

			const res = await fetch('/api/discovery/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (!res.ok) {
				setError('Analysis failed. Please try again.')
				setAnalyzing(false)
				return
			}

			const data = await res.json()
			setAnalysis(data.analysis)
			setAnalyzing(false)
			terminateOcr() // Free WASM memory — uploads are done
			transitionTo('results')
		} catch {
			setError('Connection failed. Please try again.')
			setAnalyzing(false)
		}
	}

	return (
		<styled.main
			paddingBlockStart="96px"
			paddingBlockEnd={12}
			paddingInline={{ base: 6, md: 16 }}
			minHeight="100dvh"
			position="relative"
			maxWidth="breakpoint-xl"
			marginInline="auto"
		>
			<VStack gap={8} position="relative">
				{/* Resume banner */}
				{isResuming && !analyzing && (
					<Flex
						width="100%"
						maxWidth="480px"
						marginInline="auto"
						paddingInline={4}
						paddingBlock={3}
						bg="primary/6"
						borderRadius="12px"
						alignItems="center"
						justifyContent="space-between"
						style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
					>
						<styled.span textStyle="body.sm" color="onSurface" fontWeight="500">
							Welcome back — picking up where you left off
						</styled.span>
						<styled.button
							onClick={handleStartFresh}
							display="flex"
							alignItems="center"
							gap={1.5}
							paddingInline={3}
							paddingBlock={1.5}
							bg="transparent"
							border="1px solid"
							borderColor="primary/20"
							borderRadius="8px"
							fontSize="xs"
							fontWeight="600"
							fontFamily="heading"
							color="primary"
							cursor="pointer"
							flexShrink={0}
							transition="all 0.15s ease"
							_hover={{ bg: 'primary/8' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<RefreshCw size={12} />
							Start fresh
						</styled.button>
					</Flex>
				)}

				{/* Error banner */}
				{error && (
					<Box
						width="100%"
						maxWidth="480px"
						marginInline="auto"
						paddingInline={4}
						paddingBlock={3}
						bg="red.50"
						borderRadius="12px"
						textAlign="center"
						style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
						data-testid="error-banner"
					>
						<styled.span textStyle="body.sm" color="red.600" fontWeight="500">
							{error}
						</styled.span>
					</Box>
				)}

				{/* Analyzing overlay */}
				{analyzing && (
					<VStack
						gap={4}
						width="100%"
						paddingBlock={16}
						alignItems="center"
						style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
					>
						<Box
							width="48px"
							height="48px"
							borderRadius="full"
							bg="primary/10"
							display="flex"
							alignItems="center"
							justifyContent="center"
							style={{ animation: 'scanPulse 2s ease-in-out infinite' }}
						>
							<Box
								width="24px"
								height="24px"
								borderRadius="full"
								background="linear-gradient(135deg, #623153, #FFB876)"
							/>
						</Box>
						<styled.span fontFamily="heading" fontWeight="700" fontSize="lg" color="onSurface">
							Analyzing your data...
						</styled.span>
						<styled.span
							textStyle="body.sm"
							color="onSurfaceVariant/60"
							style={{ animation: 'gentleBreathe 1.5s ease-in-out infinite' }}
						>
							Cross-referencing patterns across your sources
						</styled.span>
					</VStack>
				)}

				{/* Phase content */}
				{!analyzing && (
					<Box
						ref={phaseContainerRef}
						tabIndex={-1}
						outline="none"
						width="100%"
						style={{
							animation: transitioning
								? 'phaseExit 0.3s ease-in forwards'
								: 'meldarFadeSlideUp 0.5s ease-out both',
						}}
					>
						{phase === 'profile' && <QuickProfile onComplete={handleProfileComplete} />}

						{phase === 'data' && (
							<DataUploadHub
								ensureSession={ensureSession}
								onGenerateResults={handleRequestResults}
								onSkip={() => runAnalysis()}
							/>
						)}

						{phase === 'adaptive' && sessionId && adaptiveFollowUps.length > 0 && (
							<AdaptiveFollowUp
								followUps={adaptiveFollowUps}
								sessionId={sessionId}
								onComplete={runAnalysis}
							/>
						)}

						{phase === 'results' && analysis != null && sessionId && (
							<AnalysisResults
								analysis={analysis}
								sessionId={sessionId}
								onStartOver={handleStartFresh}
							/>
						)}
					</Box>
				)}

				{phase === 'profile' && !analyzing && <BelowFormContent />}
			</VStack>
		</styled.main>
	)
}

function FaqItem({ q, a }: { q: string; a: string }) {
	return (
		<styled.details
			width="100%"
			borderBlockEnd="1px solid"
			borderColor="outlineVariant/10"
			css={{
				'&[open] .faq-arrow': { transform: 'rotate(90deg)' },
				'&[open] .faq-answer': { gridTemplateRows: '1fr', opacity: 1 },
			}}
		>
			<styled.summary
				display="flex"
				alignItems="center"
				gap={3}
				paddingBlock={3}
				cursor="pointer"
				listStyle="none"
				css={{ '&::-webkit-details-marker': { display: 'none' } }}
			>
				<styled.span
					className="faq-arrow"
					color="primary/40"
					fontSize="xs"
					transition="transform 0.2s ease"
					flexShrink={0}
				>
					&#9654;
				</styled.span>
				<styled.span fontSize="sm" fontWeight="500" fontFamily="heading" color="onSurfaceVariant">
					{q}
				</styled.span>
			</styled.summary>
			<styled.div
				className="faq-answer"
				display="grid"
				gridTemplateRows="0fr"
				opacity={0}
				transition="grid-template-rows 0.3s ease, opacity 0.3s ease"
			>
				<styled.div overflow="hidden">
					<styled.p
						fontSize="sm"
						color="onSurfaceVariant/70"
						paddingBlockEnd={3}
						paddingInlineStart={6}
					>
						{a}
					</styled.p>
				</styled.div>
			</styled.div>
		</styled.details>
	)
}

function ResourceCard({ title, desc }: { title: string; desc: string }) {
	return (
		<VStack alignItems="flex-start" gap={1.5} paddingBlock={3}>
			<styled.h4 fontSize="sm" fontWeight="600" fontFamily="heading" color="onSurfaceVariant">
				{title}
			</styled.h4>
			<styled.p fontSize="xs" color="onSurfaceVariant/70" lineHeight="1.6">
				{desc}
			</styled.p>
		</VStack>
	)
}

function BelowFormContent() {
	return (
		<Grid
			columns={{ base: 1, md: 2 }}
			gap={8}
			width="100%"
			marginBlockStart={12}
			paddingBlockStart={8}
			borderBlockStart="1px solid"
			borderColor="outlineVariant/10"
		>
			<VStack alignItems="flex-start" gap={6}>
				<styled.h3
					fontFamily="heading"
					fontSize="xs"
					fontWeight="600"
					color="onSurfaceVariant/40"
					textTransform="uppercase"
					letterSpacing="0.08em"
				>
					Common questions
				</styled.h3>
				<VStack gap={0} width="100%">
					<FaqItem
						q="What happens with my data?"
						a="Your screenshot is read in your browser. The image never reaches our servers. We analyze the text, show you results, and throw it away."
					/>
					<FaqItem
						q="Do I need to code?"
						a="No. You tell us what bugs you, we handle the rest. If you can code, you'll get more out of it."
					/>
					<FaqItem
						q="How long does this take?"
						a="The quiz takes about a minute. Upload a screenshot and you get results in under two minutes total."
					/>
					<FaqItem
						q="What do I get?"
						a="A report showing where your time goes, what to automate first, and a recommendation for what to build."
					/>
				</VStack>
			</VStack>

			<VStack alignItems="flex-start" gap={6}>
				<styled.h3
					fontFamily="heading"
					fontSize="xs"
					fontWeight="600"
					color="onSurfaceVariant/40"
					textTransform="uppercase"
					letterSpacing="0.08em"
				>
					Why this matters
				</styled.h3>
				<VStack gap={4} width="100%">
					<ResourceCard
						title="You're already paying for AI with your data"
						desc="Google made $238 from your data last year. That same data can tell you what to build."
					/>
					<ResourceCard
						title="The people who learn AI now win"
						desc="In 2 years, AI literacy will be like computer literacy in the 2000s. Early movers have an unfair advantage."
					/>
					<ResourceCard
						title="You don't need a blank prompt"
						desc="Most AI tools start with nothing. Meldar starts with your actual patterns and builds from there."
					/>
					<ResourceCard
						title="Your first app takes minutes, not months"
						desc="People build meal planners, grade watchers, and expense trackers in their first session."
					/>
				</VStack>
			</VStack>
		</Grid>
	)
}
