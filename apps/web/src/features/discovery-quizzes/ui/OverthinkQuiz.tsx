'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { DiscoveryCard } from '@/entities/discovery-card'
import { RevealStagger, XRayCardReveal } from '@/entities/xray-result/ui/XRayCardReveal'
import { trackEvent } from '@/features/analytics'
import { Heading, Text } from '@/shared/ui'

type Question = {
	id: string
	text: string
	options: { label: string; minutes: number }[]
}

const QUESTIONS: Question[] = [
	{
		id: 'meals',
		text: 'How long does it take you to decide what to eat?',
		options: [
			{ label: 'I just grab something', minutes: 2 },
			{ label: '5-10 minutes browsing apps', minutes: 8 },
			{ label: '15+ minutes of scrolling and debating', minutes: 20 },
			{ label: 'I end up ordering delivery after 30 min', minutes: 35 },
		],
	},
	{
		id: 'outfit',
		text: 'Getting dressed in the morning?',
		options: [
			{ label: 'Grab and go', minutes: 1 },
			{ label: 'Try a couple things', minutes: 5 },
			{ label: 'Change outfits 3+ times', minutes: 15 },
			{ label: 'Stare at closet, wear the same thing anyway', minutes: 10 },
		],
	},
	{
		id: 'streaming',
		text: 'Picking something to watch?',
		options: [
			{ label: 'I have a queue', minutes: 1 },
			{ label: '10 minutes browsing', minutes: 10 },
			{ label: 'Scroll for 30 min, watch nothing', minutes: 30 },
			{ label: 'Fall asleep while deciding', minutes: 20 },
		],
	},
	{
		id: 'shopping',
		text: 'Buying something under EUR 30 online?',
		options: [
			{ label: 'Add to cart, done', minutes: 2 },
			{ label: 'Compare 3-4 options', minutes: 15 },
			{ label: 'Read reviews for 30+ minutes', minutes: 35 },
			{ label: 'Put in cart, never buy', minutes: 20 },
		],
	},
	{
		id: 'plans',
		text: 'Making weekend plans with friends?',
		options: [
			{ label: 'Someone decides, I show up', minutes: 0 },
			{ label: 'A few messages back and forth', minutes: 10 },
			{ label: 'Group chat debate for hours', minutes: 30 },
			{ label: 'Never decide, stay home', minutes: 5 },
		],
	},
	{
		id: 'text',
		text: 'Replying to an important text?',
		options: [
			{ label: 'Reply immediately', minutes: 0 },
			{ label: 'Think about it for a bit', minutes: 5 },
			{ label: 'Draft, delete, redraft', minutes: 15 },
			{ label: 'Leave it on read for days', minutes: 2 },
		],
	},
	{
		id: 'groceries',
		text: 'At the grocery store picking a product?',
		options: [
			{ label: 'Grab the usual', minutes: 0 },
			{ label: 'Compare 2-3 options', minutes: 5 },
			{ label: 'Google ingredients on the spot', minutes: 10 },
			{ label: 'Leave without buying it', minutes: 3 },
		],
	},
	{
		id: 'work',
		text: 'Starting a task you need to do?',
		options: [
			{ label: 'Just start', minutes: 0 },
			{ label: 'Organize my desk first', minutes: 10 },
			{ label: 'Research the "best way" for 30 min', minutes: 30 },
			{ label: 'Do something else instead', minutes: 15 },
		],
	},
]

type OverthinkResult = {
	weeklyMinutes: number
	yearlyHours: number
	worstCategory: string
	worstMinutes: number
	level: string
	answers: Record<string, number>
}

function calculateResult(answers: Record<string, number>): OverthinkResult {
	const dailyMinutes = Object.values(answers).reduce((sum, min) => sum + min, 0)
	const weeklyMinutes = dailyMinutes * 7
	const yearlyHours = Math.round((weeklyMinutes * 52) / 60)

	const worst = Object.entries(answers).sort(([, a], [, b]) => b - a)[0]
	const worstQ = QUESTIONS.find((q) => q.id === worst[0])

	const level =
		yearlyHours > 300
			? 'The Paralysis Pro'
			: yearlyHours > 150
				? 'The Chronic Deliberator'
				: yearlyHours > 75
					? 'The Occasional Overthinker'
					: 'The Decisive One'

	return {
		weeklyMinutes,
		yearlyHours,
		worstCategory: worstQ?.text.replace('?', '') || 'Unknown',
		worstMinutes: worst[1],
		level,
		answers,
	}
}

export function OverthinkQuiz() {
	const [current, setCurrent] = useState(0)
	const [answers, setAnswers] = useState<Record<string, number>>({})
	const [result, setResult] = useState<OverthinkResult | null>(null)

	function selectOption(questionId: string, minutes: number) {
		const newAnswers = { ...answers, [questionId]: minutes }
		setAnswers(newAnswers)

		if (current < QUESTIONS.length - 1) {
			setTimeout(() => setCurrent((c) => c + 1), 200)
		} else {
			const r = calculateResult(newAnswers)
			setResult(r)
			trackEvent({ name: 'quiz_complete', painCount: QUESTIONS.length })
		}
	}

	if (result) {
		const severity: 'low' | 'medium' | 'high' =
			result.yearlyHours > 200 ? 'high' : result.yearlyHours > 100 ? 'medium' : 'low'

		return (
			<VStack gap={6} width="100%">
				<XRayCardReveal>
					<DiscoveryCard
						label="The Overthink Report"
						bigStat={`${result.yearlyHours} hrs/year`}
						bigStatLabel="Time lost to indecision"
						severity={severity}
						rows={[
							{
								label: 'Weekly decision time',
								value: `${Math.round((result.weeklyMinutes / 60) * 10) / 10}h`,
								highlight: true,
							},
							{ label: 'Your type', value: result.level, highlight: true },
							{ label: 'Biggest time sink', value: result.worstCategory },
							{ label: 'Worst decision cost', value: `${result.worstMinutes} min/day` },
							{
								label: 'That\u2019s like',
								value: `${Math.round(result.yearlyHours / 24)} full days/year`,
							},
						]}
						insight={
							result.yearlyHours > 200
								? `You spend more time deciding than most people spend exercising. ${result.yearlyHours} hours is ${Math.round(result.yearlyHours / 8)} work days of pure hesitation.`
								: result.yearlyHours > 100
									? `${result.yearlyHours} hours a year on decisions that don\u2019t matter. That\u2019s ${Math.round(result.yearlyHours / 2)} movies you could have watched instead of picking one.`
									: `You\u2019re more decisive than most. But even ${result.yearlyHours} hours could be automated away.`
						}
					/>
				</XRayCardReveal>

				<RevealStagger delay={500}>
					<VStack gap={3} width="100%" maxWidth="440px" marginInline="auto" textAlign="center">
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
							Want to see where ALL your time goes?
						</Text>
						<styled.a
							href="/xray"
							display="inline-flex"
							alignItems="center"
							gap={2}
							paddingInline={6}
							paddingBlock={3}
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
							color="white"
							fontFamily="heading"
							fontWeight="700"
							fontSize="sm"
							borderRadius="md"
							textDecoration="none"
							_hover={{ opacity: 0.9 }}
						>
							Get your free scan
							<ArrowRight size={16} />
						</styled.a>
					</VStack>
				</RevealStagger>
			</VStack>
		)
	}

	const question = QUESTIONS[current]

	return (
		<VStack gap={6} width="100%" maxWidth="480px" marginInline="auto">
			{/* Progress */}
			<Flex gap={1} width="100%">
				{QUESTIONS.map((_, i) => (
					<Box
						key={QUESTIONS[i].id}
						flex={1}
						height="3px"
						borderRadius="full"
						bg={i <= current ? 'primary' : 'outlineVariant/20'}
						transition="background 0.3s ease"
					/>
				))}
			</Flex>

			{/* Question */}
			<VStack gap={2} textAlign="center">
				<Text textStyle="secondary.sm" color="onSurfaceVariant">
					{current + 1} of {QUESTIONS.length}
				</Text>
				<Heading textStyle="primary.sm" color="onSurface">
					{question.text}
				</Heading>
			</VStack>

			{/* Options */}
			<VStack gap={2} width="100%">
				{question.options.map((opt) => (
					<styled.button
						key={opt.label}
						onClick={() => selectOption(question.id, opt.minutes)}
						width="100%"
						textAlign="left"
						padding={4}
						bg="surfaceContainerLowest"
						border="1.5px solid"
						borderColor="outlineVariant/20"
						borderRadius="lg"
						fontSize="sm"
						fontWeight="400"
						color="onSurface"
						cursor="pointer"
						transition="all 0.15s ease"
						_hover={{ borderColor: 'primary/40', bg: 'primary/3' }}
					>
						{opt.label}
					</styled.button>
				))}
			</VStack>
		</VStack>
	)
}
