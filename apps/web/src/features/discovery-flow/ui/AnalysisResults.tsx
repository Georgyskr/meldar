'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Check, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { PurchaseButton } from '@/features/billing'
import type { DiscoveryAnalysis } from '@/shared/types/discovery'
import { LockedRecommendationCard } from './LockedRecommendationCard'

type LearningModule = DiscoveryAnalysis['learningModules'][number]

type AnalysisResultsProps = {
	analysis: DiscoveryAnalysis
	sessionId: string
	onStartOver: () => void
}

const DEFAULT_MODULES: LearningModule[] = [
	{
		id: 'coding-2026',
		title: "Coding in 2026 isn't scary",
		description: 'The new rules. No CS degree needed.',
		locked: false,
	},
	{
		id: 'prompt-rules',
		title: '5 rules to level up your prompts',
		description: 'Stop getting generic AI answers.',
		locked: false,
	},
	{
		id: 'claude-code',
		title: 'Claude Code: your co-pilot',
		description: 'Build real things with AI assistance.',
		locked: false,
	},
	{
		id: 'your-setup',
		title: 'Your perfect app setup',
		description: 'Personalized to your recommendation.',
		locked: false,
	},
]

export function AnalysisResults({ analysis, sessionId, onStartOver }: AnalysisResultsProps) {
	const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null)
	const [notifyEmail, setNotifyEmail] = useState('')
	const [notifySubmitting, setNotifySubmitting] = useState(false)
	const [notifiedModules, setNotifiedModules] = useState<Set<string>>(new Set())

	const modules = analysis.learningModules.length > 0 ? analysis.learningModules : DEFAULT_MODULES

	const allApps = [
		analysis.recommendedApp,
		...(analysis.additionalApps || []).slice(0, 2).map((a) => ({
			...a,
			complexity: undefined as 'beginner' | 'intermediate' | undefined,
			estimatedBuildTime: undefined as string | undefined,
		})),
	]

	async function handleShare() {
		const url = `${window.location.origin}/start/${sessionId}`
		try {
			if (navigator.share) {
				await navigator.share({
					title: 'My Meldar Analysis',
					text: `Meldar found my #1 app to build: ${analysis.recommendedApp.name}. Try it free.`,
					url,
				})
			} else {
				await navigator.clipboard.writeText(url)
			}
		} catch {
			// User cancelled share or clipboard unavailable
		}
	}

	function handleModuleClick(id: string) {
		if (notifiedModules.has(id)) return
		setExpandedModuleId((prev) => (prev === id ? null : id))
		setNotifyEmail('')
	}

	async function handleNotifySubmit(moduleId: string) {
		if (!notifyEmail || notifySubmitting) return
		setNotifySubmitting(true)
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: notifyEmail, source: 'module_notify' }),
			})
			if (res.ok) {
				setNotifiedModules((prev) => new Set(prev).add(moduleId))
				setExpandedModuleId(null)
			}
		} catch {
			// silently fail
		} finally {
			setNotifySubmitting(false)
		}
	}

	return (
		<VStack
			gap={10}
			width="100%"
			maxWidth="640px"
			marginInline="auto"
			style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
		>
			{/* Header */}
			<VStack gap={2} textAlign="center">
				<styled.h2 textStyle="heading.section" color="onSurface">
					We analyzed {analysis.dataProfile.totalSourcesAnalyzed} source
					{analysis.dataProfile.totalSourcesAnalyzed !== 1 ? 's' : ''}. Here&apos;s what we found.
				</styled.h2>
			</VStack>

			{/* App recommendations */}
			<VStack gap={4} width="100%">
				<styled.h3 textStyle="label.upper" color="onSurfaceVariant/60">
					Your app recommendations
				</styled.h3>

				{allApps.map((app, i) => {
					const position = i === 0 ? 'first' : i === 1 ? 'second' : 'third'
					return (
						<LockedRecommendationCard
							key={`${position}-${app.name}`}
							app={app}
							position={position}
							index={i}
							animationDelay={0.2 + i * 0.15}
						/>
					)
				})}
			</VStack>

			{/* Learning path */}
			<VStack gap={4} width="100%">
				<styled.h3 textStyle="label.upper" color="onSurfaceVariant/60">
					Your learning path
				</styled.h3>

				<Grid columns={{ base: 1, sm: 2 }} gap={3} width="100%">
					{modules.map((mod, i) => (
						<Box
							key={mod.id}
							borderRadius="14px"
							border="1px solid"
							borderColor="outlineVariant/15"
							bg="surfaceContainerLowest"
							overflow="hidden"
							transition="all 0.2s ease"
							style={{
								animation: `staggerFadeIn 0.4s ease-out ${0.3 + i * 0.1}s both`,
							}}
						>
							<styled.button
								onClick={() => handleModuleClick(mod.id)}
								display="flex"
								flexDirection="column"
								gap={0}
								width="100%"
								cursor="pointer"
								textAlign="left"
								bg="transparent"
								border="none"
								_hover={{
									'& > div:first-child': {
										borderColor: 'primary/20',
									},
								}}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
							>
								{/* Thumbnail with "Coming soon" overlay */}
								<Box
									width="100%"
									bg="surfaceContainerHigh"
									position="relative"
									style={{ aspectRatio: '16/9' }}
								>
									<Flex position="absolute" inset={0} alignItems="center" justifyContent="center">
										<styled.span
											fontFamily="heading"
											fontWeight="700"
											fontSize="sm"
											color="onSurfaceVariant/60"
											letterSpacing="0.02em"
										>
											Coming soon
										</styled.span>
									</Flex>

									{/* FREE badge */}
									<Box position="absolute" top={2} left={2}>
										<styled.span
											fontSize="10px"
											fontWeight="700"
											fontFamily="heading"
											color="white"
											bg="primary"
											paddingInline={2}
											paddingBlock={0.5}
											borderRadius="sm"
											textTransform="uppercase"
											letterSpacing="0.05em"
										>
											Free preview
										</styled.span>
									</Box>
								</Box>

								<VStack gap={1} padding={3} alignItems="flex-start">
									<styled.span
										fontFamily="heading"
										fontWeight="700"
										fontSize="sm"
										color="onSurface"
										lineHeight="1.3"
									>
										{mod.title}
									</styled.span>
									{notifiedModules.has(mod.id) ? (
										<Flex gap={1.5} alignItems="center">
											<Check size={14} color="#623153" />
											<styled.span textStyle="body.sm" color="primary" fontWeight="500">
												We&apos;ll let you know
											</styled.span>
										</Flex>
									) : (
										<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
											{mod.description}
										</styled.span>
									)}
								</VStack>
							</styled.button>

							{/* Inline notify-me form */}
							{expandedModuleId === mod.id && !notifiedModules.has(mod.id) && (
								<Box
									paddingInline={3}
									paddingBlockEnd={3}
									style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
								>
									<Flex gap={2} alignItems="stretch">
										<styled.input
											type="email"
											placeholder="your@email.com"
											value={notifyEmail}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setNotifyEmail(e.target.value)
											}
											flex={1}
											paddingInline={3}
											paddingBlock={2}
											borderRadius="8px"
											border="1.5px solid"
											borderColor="outlineVariant/25"
											bg="surfaceContainer/40"
											fontSize="sm"
											fontFamily="body"
											color="onSurface"
											outline="none"
											minHeight="44px"
											_focusVisible={{
												borderColor: 'primary',
												boxShadow: '0 0 0 2px rgba(98, 49, 83, 0.15)',
											}}
											_placeholder={{ color: 'onSurfaceVariant/40' }}
										/>
										<styled.button
											onClick={() => handleNotifySubmit(mod.id)}
											disabled={!notifyEmail || notifySubmitting}
											paddingInline={4}
											paddingBlock={2}
											borderRadius="8px"
											border="none"
											background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
											color="white"
											fontSize="sm"
											fontWeight="600"
											fontFamily="heading"
											cursor="pointer"
											whiteSpace="nowrap"
											minHeight="44px"
											transition="opacity 0.15s ease"
											_hover={{ opacity: 0.9 }}
											_disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
											_focusVisible={{
												outline: '2px solid',
												outlineColor: 'primary',
												outlineOffset: '2px',
											}}
										>
											{notifySubmitting ? '...' : 'Notify me'}
										</styled.button>
									</Flex>
								</Box>
							)}
						</Box>
					))}
				</Grid>
			</VStack>

			{/* Paywall section */}
			<VStack gap={4} width="100%">
				{/* Starter subscription tier */}
				<Box
					width="100%"
					borderRadius="16px"
					border="2px solid"
					borderColor="primary/30"
					bg="surfaceContainerLowest"
					overflow="hidden"
				>
					<Box
						paddingInline={5}
						paddingBlock={4}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					>
						<Flex justifyContent="space-between" alignItems="center">
							<styled.span fontFamily="heading" fontWeight="800" fontSize="lg" color="white">
								Start free — 7-day trial
							</styled.span>
							<styled.span fontFamily="heading" fontWeight="600" fontSize="sm" color="white/80">
								EUR 9.99/mo after trial
							</styled.span>
						</Flex>
					</Box>
					<VStack gap={4} padding={5} alignItems="stretch">
						<VStack gap={2} alignItems="flex-start">
							{[
								'Deep data analysis (ChatGPT, Claude, Google)',
								'3 analyses per month',
								'All SOPs and video tutorials',
								'Personalized curriculum',
							].map((item) => (
								<Flex key={item} gap={2} alignItems="flex-start">
									<styled.span color="primary" fontSize="sm" marginBlockStart="2px">
										&#10003;
									</styled.span>
									<styled.span textStyle="body.sm" color="onSurface">
										{item}
									</styled.span>
								</Flex>
							))}
						</VStack>
						<PurchaseButton
							product="builder"
							xrayId={sessionId}
							label="Start free trial"
							variant="primary"
						/>
					</VStack>
				</Box>

				<Grid columns={{ base: 1, md: 2 }} gap={4} width="100%">
					{/* Tier 1: Learn */}
					<Box
						borderRadius="16px"
						border="2px solid"
						borderColor="primary/20"
						bg="surfaceContainerLowest"
						overflow="hidden"
					>
						<Box
							paddingInline={5}
							paddingBlock={4}
							background="linear-gradient(135deg, #623153 0%, #874a72 100%)"
						>
							<styled.span fontFamily="heading" fontWeight="800" fontSize="lg" color="white">
								Unlock everything
							</styled.span>
						</Box>
						<VStack gap={4} padding={5} alignItems="stretch">
							<VStack gap={2} alignItems="flex-start">
								{[
									'Full analysis report',
									'All 3 app recommendations revealed',
									'Complete learning curriculum',
									'Personalized build roadmap',
								].map((item) => (
									<Flex key={item} gap={2} alignItems="flex-start">
										<styled.span color="primary" fontSize="sm" marginBlockStart="2px">
											&#10003;
										</styled.span>
										<styled.span textStyle="body.sm" color="onSurface">
											{item}
										</styled.span>
									</Flex>
								))}
							</VStack>
							<PurchaseButton
								product="timeAudit"
								xrayId={sessionId}
								label="Unlock my full results — EUR 29"
								variant="primary"
							/>
						</VStack>
					</Box>

					{/* Tier 2: Build */}
					<Box
						borderRadius="16px"
						border="2px solid"
						borderColor="outlineVariant/20"
						bg="surfaceContainerLowest"
						overflow="hidden"
						position="relative"
					>
						{/* Badge */}
						<Box position="absolute" top={3} right={3} zIndex={1}>
							<styled.span
								fontSize="10px"
								fontWeight="700"
								fontFamily="heading"
								color="white"
								bg="secondary"
								paddingInline={2.5}
								paddingBlock={1}
								borderRadius="md"
								textTransform="uppercase"
								letterSpacing="0.05em"
							>
								First 500 users
							</styled.span>
						</Box>

						<Box paddingInline={5} paddingBlock={4} bg="surfaceContainerHigh">
							<VStack gap={0.5} alignItems="flex-start">
								<styled.span fontFamily="heading" fontWeight="800" fontSize="lg" color="onSurface">
									Build it for me
								</styled.span>
								<Flex gap={2} alignItems="baseline">
									<styled.span
										fontFamily="heading"
										fontWeight="800"
										fontSize="xl"
										color="onSurface"
									>
										EUR 79
									</styled.span>
									<styled.span
										fontFamily="body"
										fontSize="sm"
										color="onSurfaceVariant/50"
										textDecoration="line-through"
									>
										EUR 149
									</styled.span>
								</Flex>
							</VStack>
						</Box>
						<VStack gap={4} padding={5} alignItems="stretch">
							<styled.p textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.6">
								Handcrafted GitHub repo + Claude Code setup + cover letter + agent config. You take
								it, you own it, you run it.
							</styled.p>
							<PurchaseButton
								product="vipBuild"
								xrayId={sessionId}
								label="Get it built — EUR 79"
								variant="secondary"
							/>
						</VStack>
					</Box>
				</Grid>
			</VStack>

			{/* Bottom actions */}
			<Flex gap={3} justifyContent="center" flexWrap="wrap" paddingBlockEnd={4}>
				<styled.button
					onClick={handleShare}
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
					<Share2 size={15} />
					Share results
				</styled.button>

				<styled.button
					onClick={onStartOver}
					display="flex"
					alignItems="center"
					gap={2}
					paddingInline={5}
					paddingBlock={3}
					bg="transparent"
					border="none"
					fontSize="sm"
					fontWeight="500"
					color="onSurfaceVariant/50"
					cursor="pointer"
					transition="color 0.15s ease"
					_hover={{ color: 'onSurface' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					<RefreshCw size={14} />
					Start over
				</styled.button>
			</Flex>
		</VStack>
	)
}
