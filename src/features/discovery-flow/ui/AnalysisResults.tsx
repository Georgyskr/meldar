'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Lock, Play, RefreshCw, Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { PurchaseButton } from '@/features/billing'
import type { DiscoveryAnalysis } from '@/server/discovery/parsers/types'

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
	const [comingSoonId, setComingSoonId] = useState<string | null>(null)

	const modules = analysis.learningModules.length > 0 ? analysis.learningModules : DEFAULT_MODULES

	const allApps = [
		analysis.recommendedApp,
		...(analysis.additionalApps || []).slice(0, 2).map((a) => ({
			...a,
			complexity: undefined as 'beginner' | 'intermediate' | undefined,
			estimatedBuildTime: undefined as string | undefined,
		})),
	]

	const handleShare = useCallback(async () => {
		const url = `${window.location.origin}/start`
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
	}, [analysis.recommendedApp.name])

	function handleModuleClick(id: string) {
		setComingSoonId(id)
		setTimeout(() => setComingSoonId(null), 3000)
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
					const isBlurred = position === 'first' || position === 'third'
					const isVisible = position === 'second'

					return (
						<Box
							key={`${position}-${app.name}`}
							width="100%"
							borderRadius="16px"
							border="1px solid"
							borderColor={isVisible ? 'primary/20' : 'outlineVariant/15'}
							bg="surfaceContainerLowest"
							overflow="hidden"
							position="relative"
							style={{
								animation: `staggerFadeIn 0.4s ease-out ${0.2 + i * 0.15}s both`,
							}}
						>
							{/* Blurred overlay for locked cards */}
							{isBlurred && (
								<>
									<Box
										position="absolute"
										inset={0}
										zIndex={2}
										display="flex"
										flexDirection="column"
										alignItems="center"
										justifyContent="center"
										gap={2}
										bg="surfaceContainerLowest/60"
										backdropFilter="blur(6px)"
									>
										<Box
											width="40px"
											height="40px"
											borderRadius="full"
											bg="primary/10"
											display="flex"
											alignItems="center"
											justifyContent="center"
										>
											<Lock size={18} color="#623153" />
										</Box>
										<styled.span
											fontFamily="heading"
											fontWeight="700"
											fontSize="sm"
											color="primary"
										>
											Unlock to see your #{i === 0 ? 1 : 3} recommendation
										</styled.span>
									</Box>

									{/* Honeypot content — not the real recommendation */}
									<VStack gap={2} padding={5} aria-hidden="true">
										<styled.span
											fontFamily="heading"
											fontWeight="700"
											fontSize="md"
											color="onSurface"
										>
											Removing the CSS doesn&apos;t show this. Nice try.
										</styled.span>
										<styled.span textStyle="body.sm" color="onSurfaceVariant">
											The real recommendation is generated server-side and only revealed after
											payment.
										</styled.span>
									</VStack>
								</>
							)}

							{/* Visible card content */}
							{isVisible && (
								<VStack gap={3} padding={5} alignItems="flex-start">
									<Flex gap={2} alignItems="center">
										<styled.span
											fontFamily="heading"
											fontWeight="800"
											fontSize="lg"
											color="onSurface"
										>
											{app.name}
										</styled.span>
										{app.complexity && (
											<styled.span
												fontSize="xs"
												fontWeight="600"
												color="primary"
												bg="primary/8"
												paddingInline={2}
												paddingBlock={0.5}
												borderRadius="md"
											>
												{app.complexity}
											</styled.span>
										)}
									</Flex>
									<styled.p textStyle="body.base" color="onSurfaceVariant">
										{app.description}
									</styled.p>
									<Box
										width="100%"
										padding={4}
										borderRadius="12px"
										bg="primary/4"
										border="1px solid"
										borderColor="primary/10"
									>
										<styled.p textStyle="body.sm" color="onSurface" lineHeight="1.6">
											<styled.span fontWeight="600" color="primary">
												Why you:
											</styled.span>{' '}
											{app.whyThisUser}
										</styled.p>
									</Box>
									{app.estimatedBuildTime && (
										<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
											Estimated build time: {app.estimatedBuildTime}
										</styled.span>
									)}
								</VStack>
							)}
						</Box>
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
						<styled.button
							key={mod.id}
							onClick={() => handleModuleClick(mod.id)}
							display="flex"
							flexDirection="column"
							gap={0}
							borderRadius="14px"
							border="1px solid"
							borderColor="outlineVariant/15"
							bg="surfaceContainerLowest"
							overflow="hidden"
							cursor="pointer"
							transition="all 0.2s ease"
							textAlign="left"
							_hover={{
								borderColor: 'primary/20',
								boxShadow: '0 4px 16px rgba(98, 49, 83, 0.08)',
							}}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
							style={{
								animation: `staggerFadeIn 0.4s ease-out ${0.3 + i * 0.1}s both`,
							}}
						>
							{/* Video thumbnail placeholder */}
							<Box
								width="100%"
								bg="surfaceContainerHigh"
								position="relative"
								style={{ aspectRatio: '16/9' }}
							>
								<Flex position="absolute" inset={0} alignItems="center" justifyContent="center">
									<Box
										width="36px"
										height="36px"
										borderRadius="full"
										bg="primary/70"
										display="flex"
										alignItems="center"
										justifyContent="center"
									>
										<Play size={16} color="white" fill="white" />
									</Box>
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
								{comingSoonId === mod.id ? (
									<styled.span
										textStyle="body.sm"
										color="primary"
										fontWeight="500"
										style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
									>
										Coming soon. We&apos;re recording this now.
									</styled.span>
								) : (
									<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
										{mod.description}
									</styled.span>
								)}
							</VStack>
						</styled.button>
					))}
				</Grid>
			</VStack>

			{/* Paywall section */}
			<VStack gap={4} width="100%">
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
								product="appBuild"
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
