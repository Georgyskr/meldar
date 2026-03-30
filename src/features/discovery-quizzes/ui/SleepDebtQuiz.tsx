'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Moon } from 'lucide-react'
import { useState } from 'react'
import { DiscoveryCard } from '@/entities/discovery-card'
import { RevealStagger, XRayCardReveal } from '@/entities/xray-result/ui/XRayCardReveal'
import { trackEvent } from '@/features/analytics'

type Question = {
	id: string
	text: string
	options: { label: string; value: number }[]
}

const QUESTIONS: Question[] = [
	{
		id: 'bedtime_plan',
		text: 'What time do you plan to go to sleep?',
		options: [
			{ label: 'Before 10 PM', value: 22 },
			{ label: '10 PM - 11 PM', value: 23 },
			{ label: '11 PM - midnight', value: 24 },
			{ label: 'After midnight', value: 1 },
		],
	},
	{
		id: 'bedtime_actual',
		text: 'What time do you actually fall asleep?',
		options: [
			{ label: 'Within 15 min of plan', value: 15 },
			{ label: '30-60 min after plan', value: 45 },
			{ label: '1-2 hours after plan', value: 90 },
			{ label: '2+ hours after plan', value: 150 },
		],
	},
	{
		id: 'last_app',
		text: 'Last app you use before sleeping?',
		options: [
			{ label: 'Nothing / reading a book', value: 0 },
			{ label: 'YouTube or Netflix', value: 30 },
			{ label: 'TikTok or Instagram Reels', value: 45 },
			{ label: 'Twitter/X or Reddit doom-scrolling', value: 40 },
		],
	},
	{
		id: 'wake_check',
		text: 'First thing you do when you wake up?',
		options: [
			{ label: 'Get up immediately', value: 0 },
			{ label: 'Check notifications (5 min)', value: 5 },
			{ label: 'Scroll social media (15+ min)', value: 20 },
			{ label: 'Snooze + scroll cycle (30+ min)', value: 35 },
		],
	},
	{
		id: 'frequency',
		text: 'How often does this happen?',
		options: [
			{ label: 'Rarely (1-2 times/week)', value: 1.5 },
			{ label: 'Sometimes (3-4 times/week)', value: 3.5 },
			{ label: 'Most nights (5-6 times/week)', value: 5.5 },
			{ label: 'Every single night', value: 7 },
		],
	},
]

type SleepResult = {
	weeklyMinutesLost: number
	yearlyHoursLost: number
	bedtimeDelay: number
	lastApp: string
	frequency: number
	level: string
}

function calculateResult(answers: Record<string, number>): SleepResult {
	const bedtimeDelay = answers.bedtime_actual || 0
	const lastAppMinutes = answers.last_app || 0
	const wakeMinutes = answers.wake_check || 0
	const frequency = answers.frequency || 3.5

	const dailyLost = bedtimeDelay + lastAppMinutes + wakeMinutes
	const weeklyMinutesLost = Math.round(dailyLost * frequency)
	const yearlyHoursLost = Math.round((weeklyMinutesLost * 52) / 60)

	const lastAppLabels: Record<number, string> = {
		0: 'Nothing',
		30: 'YouTube/Netflix',
		45: 'TikTok/Reels',
		40: 'Twitter/Reddit',
	}

	const level =
		yearlyHoursLost > 400
			? 'Revenge Bedtime Champion'
			: yearlyHoursLost > 200
				? 'The Night Owl Trap'
				: yearlyHoursLost > 100
					? 'The Mild Procrastinator'
					: 'The Healthy Sleeper'

	return {
		weeklyMinutesLost,
		yearlyHoursLost,
		bedtimeDelay,
		lastApp: lastAppLabels[lastAppMinutes] || 'Unknown',
		frequency,
		level,
	}
}

export function SleepDebtQuiz() {
	const [current, setCurrent] = useState(0)
	const [answers, setAnswers] = useState<Record<string, number>>({})
	const [result, setResult] = useState<SleepResult | null>(null)

	function selectOption(questionId: string, value: number) {
		const newAnswers = { ...answers, [questionId]: value }
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
			result.yearlyHoursLost > 300 ? 'high' : result.yearlyHoursLost > 150 ? 'medium' : 'low'

		return (
			<VStack gap={6} width="100%">
				<XRayCardReveal>
					<DiscoveryCard
						label="Sleep Debt Score"
						bigStat={`${result.yearlyHoursLost} hrs/year`}
						bigStatLabel="Lost to revenge bedtime"
						severity={severity}
						rows={[
							{
								label: 'Weekly sleep debt',
								value: `${Math.round((result.weeklyMinutesLost / 60) * 10) / 10}h`,
								highlight: true,
							},
							{ label: 'Your type', value: result.level, highlight: true },
							{ label: 'Bedtime delay', value: `${result.bedtimeDelay} min/night` },
							{ label: 'Last app before sleep', value: result.lastApp },
							{ label: 'Nights per week', value: `${result.frequency}` },
							{
								label: 'Equivalent to',
								value: `${Math.round(result.yearlyHoursLost / 8)} nights of zero sleep`,
							},
						]}
						insight={
							result.yearlyHoursLost > 300
								? `You\u2019re losing ${Math.round(result.yearlyHoursLost / 24)} full days a year to bedtime scrolling. That\u2019s not rest \u2014 it\u2019s ${result.lastApp} stealing your sleep.`
								: result.yearlyHoursLost > 150
									? `${result.yearlyHoursLost} hours of sleep debt a year. Your phone is literally keeping you awake.`
									: `Not bad, but ${result.yearlyHoursLost} hours is still ${Math.round(result.yearlyHoursLost / 8)} full nights you could sleep better.`
						}
					/>
				</XRayCardReveal>

				<RevealStagger delay={500}>
					<VStack gap={3} width="100%" maxWidth="440px" marginInline="auto" textAlign="center">
						<styled.p textStyle="body.sm" color="onSurfaceVariant">
							See the full picture of where your time goes.
						</styled.p>
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
							Get your Time X-Ray
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
						bg={i <= current ? '#623153' : 'outlineVariant/20'}
						transition="background 0.3s ease"
					/>
				))}
			</Flex>

			{/* Header */}
			<VStack gap={2} textAlign="center">
				<Moon size={24} color="#623153" strokeWidth={1.5} />
				<styled.span textStyle="body.sm" color="onSurfaceVariant">
					{current + 1} of {QUESTIONS.length}
				</styled.span>
				<styled.h2
					fontFamily="heading"
					fontSize="xl"
					fontWeight="700"
					color="onSurface"
					lineHeight="1.3"
				>
					{question.text}
				</styled.h2>
			</VStack>

			{/* Options */}
			<VStack gap={2} width="100%">
				{question.options.map((opt) => (
					<styled.button
						key={opt.label}
						onClick={() => selectOption(question.id, opt.value)}
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
