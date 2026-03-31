'use client'

import { Flex, Grid, styled, VStack } from '@styled-system/jsx'
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
		// Persist selections so /xray can read them
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('meldar-quiz-picks', JSON.stringify(picks.map((p) => p.id)))
		}
		return <QuizResults picks={picks} />
	}

	return (
		<VStack gap={8} width="100%" maxWidth="breakpoint-lg" marginInline="auto">
			<VStack gap={3} textAlign="center">
				<styled.h2 fontFamily="heading" fontSize="3xl" fontWeight="700" color="onSurface">
					What eats your time?
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
	return (
		<VStack gap={8} width="100%" maxWidth="breakpoint-md" marginInline="auto">
			<VStack gap={3} textAlign="center">
				<styled.span fontFamily="heading" fontSize="5xl" fontWeight="800" color="primary">
					{picks.length} time drains
				</styled.span>
				<styled.h2 fontFamily="heading" fontSize="2xl" fontWeight="700" color="onSurface">
					You named them. Now let&apos;s measure them.
				</styled.h2>
				<styled.p textStyle="body.base" color="onSurfaceVariant">
					People who pick these same items typically lose 8-14 hours a week. Want YOUR actual
					number?
				</styled.p>
			</VStack>

			<VStack gap={4} width="100%">
				{picks.map((pick) => (
					<Flex
						key={pick.id}
						gap={4}
						padding={6}
						bg="surfaceContainerLowest"
						borderRadius="xl"
						border="1px solid"
						borderColor="outlineVariant/10"
						alignItems="flex-start"
						width="100%"
					>
						<styled.span fontSize="2xl" flexShrink={0}>
							{pick.emoji}
						</styled.span>
						<VStack alignItems="flex-start" gap={1} flex={1}>
							<styled.span fontFamily="heading" fontWeight="700" color="onSurface">
								{pick.title}
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurfaceVariant">
								{pick.automationHint}
							</styled.span>
						</VStack>
					</Flex>
				))}
			</VStack>

			<VStack gap={4} alignItems="center" paddingBlockStart={4}>
				<styled.p textStyle="body.base" color="onSurfaceVariant" textAlign="center">
					A 30-second screenshot gives you the real picture.
				</styled.p>
				<styled.a
					href="/xray"
					paddingInline={8}
					paddingBlock={4}
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					fontFamily="heading"
					fontWeight="700"
					borderRadius="md"
					textDecoration="none"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.9 }}
				>
					Get your real Time X-Ray
				</styled.a>
			</VStack>
		</VStack>
	)
}
