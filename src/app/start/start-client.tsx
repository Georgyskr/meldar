'use client'

import { Box, styled, VStack } from '@styled-system/jsx'
import { useState } from 'react'
import {
	AnalysisResults,
	DataUploadHub,
	type ProfileData,
	QuickProfile,
} from '@/features/discovery-flow'
import type { DiscoveryAnalysis } from '@/server/discovery/parsers/types'

type Phase = 'profile' | 'data' | 'results'

type SessionData = ProfileData & {
	sessionId: string
}

export function StartClient() {
	const [phase, setPhase] = useState<Phase>('profile')
	const [transitioning, setTransitioning] = useState(false)
	const [session, setSession] = useState<SessionData | null>(null)
	const [analysis, setAnalysis] = useState<DiscoveryAnalysis | null>(null)
	const [error, setError] = useState('')
	const [analyzing, setAnalyzing] = useState(false)

	function transitionTo(next: Phase) {
		setTransitioning(true)
		setTimeout(() => {
			setPhase(next)
			setTransitioning(false)
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}, 300)
	}

	async function handleProfileComplete(data: ProfileData) {
		setError('')
		try {
			const res = await fetch('/api/discovery/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					quizPicks: data.painPicks,
					aiComfort: data.aiComfort,
					aiToolsUsed: data.aiToolsUsed,
				}),
			})

			if (!res.ok) {
				setError('Failed to save your answers. Please try again.')
				return
			}

			const { sessionId } = await res.json()
			setSession({ ...data, sessionId })
			transitionTo('data')
		} catch {
			setError('Connection failed. Please try again.')
		}
	}

	async function handleAnalyze() {
		if (!session) return
		setAnalyzing(true)
		setError('')

		try {
			const res = await fetch('/api/discovery/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: session.sessionId }),
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

	function handleStartOver() {
		setSession(null)
		setAnalysis(null)
		setError('')
		transitionTo('profile')
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
						width="100%"
						style={{
							animation: transitioning
								? 'phaseExit 0.3s ease-in forwards'
								: 'meldarFadeSlideUp 0.5s ease-out both',
						}}
					>
						{phase === 'profile' && <QuickProfile onComplete={handleProfileComplete} />}

						{phase === 'data' && session && (
							<DataUploadHub
								sessionId={session.sessionId}
								onGenerateResults={handleAnalyze}
								onSkip={handleAnalyze}
							/>
						)}

						{phase === 'results' && analysis && session && (
							<AnalysisResults
								analysis={analysis}
								sessionId={session.sessionId}
								onStartOver={handleStartOver}
							/>
						)}
					</Box>
				)}
			</VStack>
		</styled.main>
	)
}
