'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { type PainPoint, painLibrary } from '@/entities/pain-points'

type QuizState = 'picking' | 'results'

export function PainQuiz() {
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [state, setState] = useState<QuizState>('picking')

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else if (next.size < 5) {
				next.add(id)
			}
			return next
		})
	}

	function showResults() {
		if (selected.size >= 2) {
			setState('results')
		}
	}

	if (state === 'results') {
		const picks = painLibrary.filter((p) => selected.has(p.id))
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('meldar-quiz-picks', JSON.stringify(picks.map((p) => p.id)))
		}
		return <QuizResults picks={picks} />
	}

	return (
		<VStack gap={8} width="100%" maxWidth="breakpoint-lg" marginInline="auto">
			<VStack gap={3} textAlign="center">
				<styled.h2 fontFamily="heading" fontSize="3xl" fontWeight="700" color="onSurface">
					What would you fix first?
				</styled.h2>
				<styled.p textStyle="body.lead" color="onSurfaceVariant">
					Pick 2&ndash;5 that feel like your life. No signup needed.
				</styled.p>
			</VStack>

			<Grid columns={{ base: 2, md: 3, lg: 4 }} gap={4} width="100%">
				{painLibrary.map((pain) => (
					<PainTile
						key={pain.id}
						pain={pain}
						isSelected={selected.has(pain.id)}
						onToggle={() => toggle(pain.id)}
					/>
				))}
			</Grid>

			<Flex gap={4} alignItems="center">
				<styled.button
					onClick={showResults}
					disabled={selected.size < 2}
					paddingInline={8}
					paddingBlock={4}
					background={
						selected.size >= 2
							? 'linear-gradient(135deg, #623153 0%, #FFB876 100%)'
							: 'surfaceContainerHighest'
					}
					color={selected.size >= 2 ? 'white' : 'onSurface/40'}
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					borderRadius="md"
					border="none"
					cursor={selected.size >= 2 ? 'pointer' : 'not-allowed'}
					transition="all 0.2s ease"
					_hover={selected.size >= 2 ? { opacity: 0.9 } : {}}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					Show me what to fix ({selected.size}/5)
				</styled.button>
				{selected.size < 2 && (
					<styled.span textStyle="body.sm" color="onSurfaceVariant">
						Pick at least 2
					</styled.span>
				)}
			</Flex>
		</VStack>
	)
}

function PainTile({
	pain,
	isSelected,
	onToggle,
}: {
	pain: PainPoint
	isSelected: boolean
	onToggle: () => void
}) {
	return (
		<styled.button
			onClick={onToggle}
			display="flex"
			flexDir="column"
			alignItems="flex-start"
			gap={2}
			padding={5}
			bg={isSelected ? 'primary/5' : 'surfaceContainerLowest'}
			border="2px solid"
			borderColor={isSelected ? 'primary' : 'outlineVariant/10'}
			borderRadius="xl"
			cursor="pointer"
			textAlign="left"
			transition="all 0.15s ease"
			_hover={{ borderColor: isSelected ? 'primary' : 'outlineVariant/30' }}
			_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
		>
			<styled.span fontSize="2xl">{pain.emoji}</styled.span>
			<styled.span fontFamily="heading" fontWeight="700" fontSize="sm" color="onSurface">
				{pain.title}
			</styled.span>
			<styled.span fontSize="xs" color="onSurfaceVariant" lineHeight="relaxed">
				{pain.description}
			</styled.span>
		</styled.button>
	)
}

function QuizResults({ picks }: { picks: PainPoint[] }) {
	// Calculate estimated hours from the pain library data
	const totalWeeklyHours = picks.reduce((sum, pick) => {
		const match = pick.weeklyHours.match(/(\d+)/)
		return sum + (match ? Number.parseInt(match[1], 10) : 2)
	}, 0)
	const yearlyHours = totalWeeklyHours * 52

	return (
		<VStack
			gap={10}
			width="100%"
			maxWidth="breakpoint-sm"
			marginInline="auto"
			style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
		>
			{/* The number */}
			<VStack gap={4} textAlign="center">
				<styled.span
					fontFamily="heading"
					fontSize={{ base: '6xl', md: '7xl' }}
					fontWeight="800"
					color="primary"
					letterSpacing="-0.04em"
					lineHeight="1"
				>
					~{yearlyHours}
				</styled.span>
				<styled.span fontFamily="heading" fontSize="xl" fontWeight="600" color="onSurface">
					hours a year. Gone.
				</styled.span>
				<styled.p textStyle="body.base" color="onSurfaceVariant" maxWidth="400px">
					And that&apos;s just from {picks.length} things you picked. There&apos;s probably more we
					can&apos;t figure out from a quiz alone.
				</styled.p>
			</VStack>

			{/* What they picked — compact, not the main event */}
			<Box
				width="100%"
				padding={5}
				borderRadius="16px"
				bg="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/10"
			>
				<styled.p
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					color="onSurfaceVariant/50"
					textTransform="uppercase"
					letterSpacing="0.06em"
					marginBlockEnd={3}
				>
					What you picked
				</styled.p>
				<Flex gap={2} flexWrap="wrap">
					{picks.map((pick) => (
						<styled.span
							key={pick.id}
							display="inline-flex"
							alignItems="center"
							gap={1}
							paddingInline={3}
							paddingBlock="6px"
							bg="primary/5"
							borderRadius="full"
							fontSize="sm"
							fontWeight="500"
							color="onSurface"
						>
							{pick.emoji} {pick.title}
						</styled.span>
					))}
				</Flex>
			</Box>

			{/* Two paths */}
			<VStack gap={4} width="100%">
				<styled.p textStyle="body.sm" color="onSurfaceVariant" textAlign="center" fontWeight="500">
					What do you want to do next?
				</styled.p>

				{/* Path 1: Screen Recap — find out more with real data */}
				<styled.a
					href="/xray"
					display="flex"
					alignItems="center"
					justifyContent="space-between"
					width="100%"
					padding={5}
					borderRadius="16px"
					background="linear-gradient(135deg, #623153 0%, #874a72 50%, #FFB876 100%)"
					textDecoration="none"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.92 }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<VStack gap={1} alignItems="flex-start">
						<styled.span fontFamily="heading" fontWeight="700" fontSize="md" color="white">
							Get your real numbers
						</styled.span>
						<styled.span fontSize="xs" color="white/70">
							Upload a screen time screenshot. 30 seconds. Deleted immediately.
						</styled.span>
					</VStack>
					<ArrowRight size={20} color="rgba(255,255,255,0.6)" />
				</styled.a>

				{/* Path 2: Already know what to build */}
				<styled.a
					href="mailto:georgy@meldar.ai?subject=I%20know%20what%20I%20want%20to%20build"
					display="flex"
					alignItems="center"
					justifyContent="space-between"
					width="100%"
					padding={5}
					borderRadius="16px"
					bg="surfaceContainerLowest"
					border="1.5px solid"
					borderColor="outlineVariant/20"
					textDecoration="none"
					transition="all 0.2s ease"
					_hover={{ borderColor: 'primary/30', bg: 'surfaceContainer' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<VStack gap={1} alignItems="flex-start">
						<Flex gap={2} alignItems="center">
							<Sparkles size={16} color="#623153" />
							<styled.span fontFamily="heading" fontWeight="700" fontSize="md" color="onSurface">
								I already know what I want to build
							</styled.span>
						</Flex>
						<styled.span fontSize="xs" color="onSurfaceVariant">
							Tell us and we&apos;ll help you get started. On your own terms.
						</styled.span>
					</VStack>
					<ArrowRight size={20} color="#81737a" />
				</styled.a>
			</VStack>
		</VStack>
	)
}
