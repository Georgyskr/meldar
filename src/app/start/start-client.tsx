'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { RESET } from 'jotai/utils'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
	uploadStatusAtom,
} from '@/features/discovery-flow'

export function StartClient() {
	const [phase, setPhase] = useAtom(phaseAtom)
	const [sessionId, setSessionId] = useAtom(sessionIdAtom)
	const [, setProfileData] = useAtom(profileDataAtom)
	const [analysis, setAnalysis] = useAtom(analysisAtom)
	const [, setUploadStatus] = useAtom(uploadStatusAtom)
	const [adaptiveFollowUps, setAdaptiveFollowUps] = useAtom(adaptiveFollowUpsAtom)
	const [, setAdaptiveAnswers] = useAtom(adaptiveAnswersAtom)

	const [transitioning, setTransitioning] = useState(false)
	const [error, setError] = useState('')
	const [analyzing, setAnalyzing] = useState(false)

	const phaseContainerRef = useRef<HTMLDivElement>(null)
	const [focusTrigger, setFocusTrigger] = useState(0)

	/** Focus the phase container after each phase transition for a11y */
	// biome-ignore lint/correctness/useExhaustiveDependencies: focusTrigger is an intentional re-run trigger
	useEffect(() => {
		if (phaseContainerRef.current) {
			const heading = phaseContainerRef.current.querySelector('h1, h2, h3, [tabindex]')
			if (heading instanceof HTMLElement) {
				heading.focus({ preventScroll: true })
			} else {
				phaseContainerRef.current.focus({ preventScroll: true })
			}
		}
	}, [focusTrigger])

	const isResuming = sessionId !== null && phase !== 'profile'

	function transitionTo(next: 'profile' | 'data' | 'adaptive' | 'results') {
		setTransitioning(true)
		setTimeout(() => {
			setPhase(next)
			setTransitioning(false)
			setFocusTrigger((n) => n + 1)
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

	async function handleProfileComplete(data: ProfileData) {
		setError('')
		try {
			const res = await fetch('/api/discovery/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					occupation: data.occupation,
					ageBracket: data.ageBracket,
					quizPicks: data.painPicks,
					aiComfort: data.aiComfort,
					aiToolsUsed: data.aiToolsUsed,
				}),
			})

			if (!res.ok) {
				setError('Failed to save your answers. Please try again.')
				return
			}

			const { sessionId: newSessionId } = await res.json()
			setSessionId(newSessionId)
			setProfileData(data)
			transitionTo('data')
		} catch {
			setError('Connection failed. Please try again.')
		}
	}

	async function handleRequestResults() {
		if (!sessionId) return
		setAnalyzing(true)
		setError('')

		try {
			// First, check for adaptive follow-ups
			const adaptiveRes = await fetch('/api/discovery/adaptive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId }),
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
		if (!sessionId) return
		setAnalyzing(true)
		setError('')

		try {
			const payload: Record<string, unknown> = { sessionId }
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
			paddingInline={5}
			minHeight="100dvh"
			position="relative"
		>
			<VStack gap={8} maxWidth="720px" marginInline="auto" position="relative">
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

						{phase === 'data' && sessionId && (
							<DataUploadHub
								sessionId={sessionId}
								onGenerateResults={handleRequestResults}
								onSkip={runAnalysis}
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
			</VStack>
		</styled.main>
	)
}
