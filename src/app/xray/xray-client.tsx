'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Shield } from 'lucide-react'
import { useState } from 'react'
import type { XRayResponse } from '@/entities/xray-result/model/types'
import { XRayCard } from '@/entities/xray-result/ui/XRayCard'
import { XRayCardActions } from '@/entities/xray-result/ui/XRayCardActions'
import { RevealStagger, XRayCardReveal } from '@/entities/xray-result/ui/XRayCardReveal'
import { UpsellBlock } from '@/features/billing'
import { FocusAmbient } from '@/features/focus-mode'
import {
	ContextChip,
	type LifeStage,
	ResultEmailCapture,
	ScreenshotGuide,
	UploadZone,
} from '@/features/screenshot-upload'

type ResultData = XRayResponse & { id: string }
type Phase = 'context' | 'guide' | 'upload' | 'result'

export function XRayPageClient() {
	const [phase, setPhase] = useState<Phase>('context')
	const [lifeStage, setLifeStage] = useState<LifeStage | null>(null)
	const [result, setResult] = useState<ResultData | null>(null)
	const [showDeletionBanner, setShowDeletionBanner] = useState(false)

	function handleContextSelect(stage: LifeStage) {
		setLifeStage(stage)
		// Short delay for the chip to visually settle, then advance
		setTimeout(() => setPhase('guide'), 300)
	}

	function handleGuideComplete() {
		setPhase('upload')
	}

	function handleResult(data: ResultData) {
		setResult(data)
		setPhase('result')
		setShowDeletionBanner(true)
		setTimeout(() => setShowDeletionBanner(false), 5000)
	}

	function reset() {
		setPhase('upload')
		setResult(null)
	}

	// Contextual headline based on life stage
	const contextHeadlines: Record<LifeStage, string> = {
		student: 'Is your phone eating your study time?',
		working: 'Where does your day actually go?',
		freelance: 'Are you billing hours or scrolling them?',
		'job-hunting': 'Is your phone helping or distracting your search?',
	}

	return (
		<styled.main paddingBlock={16} paddingInline={6} minHeight="100dvh" position="relative">
			<FocusAmbient />
			<VStack gap={8} maxWidth="640px" marginInline="auto" position="relative" zIndex={1}>
				{/* Header — adapts based on phase */}
				<VStack gap={3} textAlign="center">
					<styled.h1
						fontFamily="heading"
						fontSize={{ base: '2xl', md: '3xl' }}
						fontWeight="800"
						color="onSurface"
						letterSpacing="-0.02em"
					>
						{phase === 'result' && lifeStage ? contextHeadlines[lifeStage] : 'Your Time X-Ray'}
					</styled.h1>
					{phase !== 'result' && (
						<styled.p textStyle="body.base" color="onSurfaceVariant" maxWidth="440px">
							{phase === 'context'
								? 'One tap, then one screenshot. Takes under a minute.'
								: phase === 'guide'
									? 'Here\u2019s exactly what to screenshot.'
									: 'Upload your Screen Time screenshot.'}
						</styled.p>
					)}
				</VStack>

				{/* Phase: Context chip selection */}
				{phase === 'context' && (
					<VStack gap={6} width="100%">
						<ContextChip selected={lifeStage} onSelect={handleContextSelect} />
						<styled.button
							onClick={() => setPhase('guide')}
							fontSize="sm"
							color="onSurfaceVariant/60"
							bg="transparent"
							border="none"
							cursor="pointer"
							_hover={{ color: 'onSurface' }}
						>
							Skip this
						</styled.button>
					</VStack>
				)}

				{/* Phase: Screenshot guide */}
				{phase === 'guide' && <ScreenshotGuide onDismiss={handleGuideComplete} />}

				{/* Phase: Upload */}
				{phase === 'upload' && (
					<VStack gap={4} width="100%">
						<UploadZone onResult={handleResult} />
						<Flex gap={2} alignItems="center" justifyContent="center" paddingBlock={2}>
							<Shield size={12} color="#81737a" />
							<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
								Processed in ~3 seconds. Deleted immediately. Never stored.
							</styled.span>
						</Flex>
					</VStack>
				)}

				{/* Phase: Results */}
				{phase === 'result' && result && (
					<VStack gap={6} width="100%">
						{/* Deletion confirmation */}
						{showDeletionBanner && (
							<Box
								width="100%"
								maxWidth="440px"
								marginInline="auto"
								paddingInline={4}
								paddingBlock={3}
								bg="green.50"
								borderRadius="lg"
								textAlign="center"
								style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
							>
								<styled.span textStyle="body.sm" color="green.700" fontWeight="500">
									&#10003; Screenshot deleted. Only the extracted data remains.
								</styled.span>
							</Box>
						)}

						{/* X-Ray Card */}
						<XRayCardReveal>
							<XRayCard
								totalHours={Math.round((result.extraction.totalScreenTimeMinutes / 60) * 10) / 10}
								topApp={result.extraction.apps[0]?.name || 'Unknown'}
								apps={result.extraction.apps}
								pickups={result.extraction.pickups}
								insights={result.insights}
							/>
						</XRayCardReveal>

						{/* Share actions */}
						<RevealStagger delay={400}>
							<XRayCardActions xrayId={result.id} />
						</RevealStagger>

						{/* Contextual insight based on life stage */}
						{lifeStage && result.extraction.apps[0] && (
							<RevealStagger delay={500}>
								<Box
									width="100%"
									maxWidth="440px"
									marginInline="auto"
									padding={5}
									borderRadius="xl"
									bg="primary/5"
									border="1px solid"
									borderColor="primary/15"
								>
									<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.6">
										{lifeStage === 'student' && (
											<>
												As a student, {(result.extraction.totalScreenTimeMinutes / 60).toFixed(1)}{' '}
												hours of daily screen time means{' '}
												<styled.span fontWeight="600" color="primary">
													{Math.round((result.extraction.totalScreenTimeMinutes / 60) * 7)} hours a
													week
												</styled.span>{' '}
												not spent studying, exercising, or sleeping.
											</>
										)}
										{lifeStage === 'working' && (
											<>
												That&apos;s{' '}
												<styled.span fontWeight="600" color="primary">
													{Math.round((result.extraction.totalScreenTimeMinutes / 60) * 7)} hours a
													week
												</styled.span>{' '}
												of personal screen time on top of your work screen. The average is 4.5
												hours.
											</>
										)}
										{lifeStage === 'freelance' && (
											<>
												At a freelance rate of EUR 50/hr, this screen time costs you{' '}
												<styled.span fontWeight="600" color="primary">
													~EUR {Math.round((result.extraction.totalScreenTimeMinutes / 60) * 50)}
													/day
												</styled.span>{' '}
												in potential earnings.
											</>
										)}
										{lifeStage === 'job-hunting' && (
											<>
												{result.extraction.apps[0].name} alone takes{' '}
												<styled.span fontWeight="600" color="primary">
													{Math.round((result.extraction.apps[0].usageMinutes / 60) * 7)} hours/week
												</styled.span>
												. That&apos;s time that could go to applications, portfolio work, or
												networking.
											</>
										)}
									</styled.p>
								</Box>
							</RevealStagger>
						)}

						{/* Additional insights */}
						{result.insights.length > 1 && (
							<RevealStagger delay={700}>
								<VStack gap={3} width="100%" maxWidth="440px" marginInline="auto">
									{result.insights.slice(1).map((insight) => (
										<Box
											key={insight.headline}
											width="100%"
											padding={4}
											borderRadius="lg"
											bg="surfaceContainerLowest"
											border="1px solid"
											borderColor="outlineVariant/10"
										>
											<styled.p textStyle="body.sm" fontWeight="500" color="onSurface">
												{insight.headline}
											</styled.p>
											<styled.p textStyle="body.sm" color="onSurfaceVariant" marginBlockStart={1}>
												{insight.comparison}
											</styled.p>
										</Box>
									))}
								</VStack>
							</RevealStagger>
						)}

						{/* Upsell */}
						<RevealStagger delay={900}>
							<UpsellBlock upsells={result.upsells} xrayId={result.id} />
						</RevealStagger>

						{/* Email capture */}
						<RevealStagger delay={1100}>
							<ResultEmailCapture xrayId={result.id} />
						</RevealStagger>

						{/* Actions */}
						<RevealStagger delay={1200}>
							<Flex gap={3} justifyContent="center" flexWrap="wrap">
								<styled.button
									onClick={reset}
									display="flex"
									alignItems="center"
									gap={1}
									paddingInline={5}
									paddingBlock={3}
									bg="transparent"
									border="1px solid"
									borderColor="outlineVariant"
									borderRadius="md"
									fontSize="sm"
									fontWeight="500"
									color="onSurfaceVariant"
									cursor="pointer"
									_hover={{ bg: 'surfaceContainer' }}
								>
									Upload another screenshot
								</styled.button>
								<styled.a
									href="/"
									display="flex"
									alignItems="center"
									gap={1}
									paddingInline={5}
									paddingBlock={3}
									bg="transparent"
									border="none"
									fontSize="sm"
									fontWeight="500"
									color="onSurfaceVariant/60"
									textDecoration="none"
									_hover={{ color: 'onSurface' }}
								>
									Back to Meldar
									<ArrowRight size={14} />
								</styled.a>
							</Flex>
						</RevealStagger>
					</VStack>
				)}
			</VStack>
		</styled.main>
	)
}
