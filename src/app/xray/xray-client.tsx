'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Shield } from 'lucide-react'
import { useRef, useState } from 'react'
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
	UploadZone,
} from '@/features/screenshot-upload'

type ResultData = XRayResponse & { id: string }
type Phase = 'scan' | 'result'

export function XRayPageClient() {
	const [phase, setPhase] = useState<Phase>('scan')
	const [lifeStage, setLifeStage] = useState<LifeStage | null>(null)
	const [result, setResult] = useState<ResultData | null>(null)
	const [showDeletionBanner, setShowDeletionBanner] = useState(false)
	const cardRef = useRef<HTMLDivElement>(null)

	function handleResult(data: ResultData) {
		setResult(data)
		setPhase('result')
		setTimeout(() => setShowDeletionBanner(true), 800)
		setTimeout(() => setShowDeletionBanner(false), 5800)
	}

	function reset() {
		setPhase('scan')
		setResult(null)
	}

	const contextHeadlines: Record<LifeStage, string> = {
		student: 'Is your phone eating your study time?',
		working: 'Where does your day actually go?',
		freelance: 'Are you billing hours or scrolling them?',
		'job-hunting': 'Is your phone helping or distracting your search?',
	}

	return (
		<styled.main
			paddingBlockStart="96px"
			paddingBlockEnd={12}
			paddingInline={5}
			minHeight="100dvh"
			position="relative"
		>
			<FocusAmbient />
			<VStack gap={8} maxWidth="640px" marginInline="auto" position="relative" zIndex={1}>
				{/* ── SCAN PHASE: context + upload unified ── */}
				{phase === 'scan' && (
					<VStack
						gap={8}
						width="100%"
						style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
					>
						{/* Header */}
						<VStack gap={3} textAlign="center">
							<styled.h1
								fontFamily="heading"
								fontSize={{ base: '2xl', md: '3xl' }}
								fontWeight="800"
								color="onSurface"
								letterSpacing="-0.025em"
								lineHeight="1.15"
							>
								Your Time X-Ray
							</styled.h1>
							<styled.p
								textStyle="body.base"
								color="onSurfaceVariant/70"
								maxWidth="380px"
								marginInline="auto"
								lineHeight="1.5"
							>
								One screenshot. Under a minute. See where your time actually goes.
							</styled.p>
						</VStack>

						{/* Life stage context — inline, optional */}
						<VStack gap={2} width="100%">
							<styled.span
								fontSize="xs"
								fontWeight="600"
								fontFamily="heading"
								color="onSurfaceVariant/50"
								textTransform="uppercase"
								letterSpacing="0.06em"
							>
								I&apos;m currently&hellip;
							</styled.span>
							<ContextChip selected={lifeStage} onSelect={setLifeStage} />
						</VStack>

						{/* Upload zone */}
						<UploadZone onResult={handleResult} />

						{/* Privacy reassurance */}
						<Flex gap={2} alignItems="center" justifyContent="center" paddingBlock={1}>
							<Shield size={12} color="#81737a" />
							<styled.span fontSize="xs" color="onSurfaceVariant/50">
								Processed in ~3 seconds. Deleted immediately. Never stored.
							</styled.span>
						</Flex>
					</VStack>
				)}

				{/* ── RESULT PHASE: dramatic staggered reveal ── */}
				{phase === 'result' && result && (
					<VStack gap={6} width="100%">
						{/* Contextual headline */}
						<VStack
							gap={1}
							textAlign="center"
							style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
						>
							<styled.h1
								fontFamily="heading"
								fontSize={{ base: '2xl', md: '3xl' }}
								fontWeight="800"
								color="onSurface"
								letterSpacing="-0.025em"
								lineHeight="1.15"
							>
								{lifeStage ? contextHeadlines[lifeStage] : 'Here\u2019s your X-Ray'}
							</styled.h1>
						</VStack>

						{/* Deletion confirmation */}
						{showDeletionBanner && (
							<Flex
								width="100%"
								maxWidth="440px"
								marginInline="auto"
								paddingInline={4}
								paddingBlock={3}
								bg="primary/4"
								borderRadius="12px"
								alignItems="center"
								justifyContent="center"
								gap={2}
								style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
							>
								<Shield size={13} color="#623153" />
								<styled.span textStyle="body.sm" color="primary" fontWeight="500">
									Screenshot deleted. Only the extracted data remains.
								</styled.span>
							</Flex>
						)}

						{/* X-Ray Card */}
						<XRayCardReveal>
							<Box ref={cardRef}>
								<XRayCard
									totalHours={Math.round((result.extraction.totalScreenTimeMinutes / 60) * 10) / 10}
									topApp={result.extraction.apps[0]?.name || 'Unknown'}
									apps={result.extraction.apps}
									pickups={result.extraction.pickups}
									insights={result.insights}
								/>
							</Box>
						</XRayCardReveal>

						{/* Share actions */}
						<RevealStagger delay={400}>
							<XRayCardActions
								xrayId={result.id}
								totalHours={Math.round((result.extraction.totalScreenTimeMinutes / 60) * 10) / 10}
								topApp={result.extraction.apps[0]?.name}
								cardRef={cardRef}
							/>
						</RevealStagger>

						{/* Contextual insight based on life stage */}
						{lifeStage && result.extraction.apps[0] && (
							<RevealStagger delay={500}>
								<Box
									width="100%"
									maxWidth="440px"
									marginInline="auto"
									padding={5}
									borderRadius="16px"
									bg="primary/4"
									border="1px solid"
									borderColor="primary/10"
								>
									<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.65">
										{lifeStage === 'student' && (
											<>
												As a student, {(result.extraction.totalScreenTimeMinutes / 60).toFixed(1)}{' '}
												hours of daily screen time means{' '}
												<styled.span fontWeight="700" color="primary">
													{Math.round((result.extraction.totalScreenTimeMinutes / 60) * 7)} hours a
													week
												</styled.span>{' '}
												not spent studying, exercising, or sleeping.
											</>
										)}
										{lifeStage === 'working' && (
											<>
												That&apos;s{' '}
												<styled.span fontWeight="700" color="primary">
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
												<styled.span fontWeight="700" color="primary">
													~EUR {Math.round((result.extraction.totalScreenTimeMinutes / 60) * 50)}
													/day
												</styled.span>{' '}
												in potential earnings.
											</>
										)}
										{lifeStage === 'job-hunting' && (
											<>
												{result.extraction.apps[0].name} alone takes{' '}
												<styled.span fontWeight="700" color="primary">
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
											borderRadius="14px"
											bg="surfaceContainerLowest"
											border="1px solid"
											borderColor="outlineVariant/10"
										>
											<styled.p
												textStyle="body.sm"
												fontWeight="600"
												color="onSurface"
												fontFamily="heading"
											>
												{insight.headline}
											</styled.p>
											<styled.p
												textStyle="body.sm"
												color="onSurfaceVariant/70"
												marginBlockStart={1}
											>
												{insight.comparison}
											</styled.p>
										</Box>
									))}
								</VStack>
							</RevealStagger>
						)}

						{/* Email capture (lower friction — show before upsell) */}
						<RevealStagger delay={900}>
							<ResultEmailCapture xrayId={result.id} />
						</RevealStagger>

						{/* Upsell */}
						<RevealStagger delay={1100}>
							<UpsellBlock upsells={result.upsells} xrayId={result.id} />
						</RevealStagger>

						{/* Actions */}
						<RevealStagger delay={1200}>
							<Flex gap={3} justifyContent="center" flexWrap="wrap">
								<styled.button
									onClick={reset}
									display="flex"
									alignItems="center"
									gap={2}
									paddingInline={5}
									paddingBlock={3}
									bg="transparent"
									border="1.5px solid"
									borderColor="outlineVariant/20"
									borderRadius="12px"
									fontSize="sm"
									fontWeight="600"
									fontFamily="heading"
									color="onSurfaceVariant"
									cursor="pointer"
									transition="all 0.2s ease"
									_hover={{ bg: 'surfaceContainer', borderColor: 'outlineVariant/40' }}
									_focusVisible={{
										outline: '2px solid',
										outlineColor: 'primary',
										outlineOffset: '2px',
									}}
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
									color="onSurfaceVariant/50"
									textDecoration="none"
									transition="color 0.15s ease"
									_hover={{ color: 'onSurface' }}
									_focusVisible={{
										outline: '2px solid',
										outlineColor: 'primary',
										outlineOffset: '2px',
									}}
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
