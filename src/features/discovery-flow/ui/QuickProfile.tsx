'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { BookOpen, Briefcase, Check, Laptop, type LucideIcon, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { painLibrary } from '@/entities/pain-points/model/data'

export type ProfileData = {
	occupation: string
	ageBracket: string
	painPicks: string[]
	aiComfort: number
	aiToolsUsed: string[]
}

type QuickProfileProps = {
	onComplete: (data: ProfileData) => void
}

const OCCUPATION_OPTIONS: { id: string; label: string; subtitle: string; icon: LucideIcon }[] = [
	{ id: 'student', label: 'Student', subtitle: 'Classes, exams, side projects', icon: BookOpen },
	{ id: 'working', label: 'Working', subtitle: '9-to-5, meetings, commute', icon: Briefcase },
	{ id: 'freelance', label: 'Freelance', subtitle: 'Clients, invoices, hustle', icon: Laptop },
	{
		id: 'job-hunting',
		label: 'Job hunting',
		subtitle: 'Applications, interviews, waiting',
		icon: Search,
	},
]

const AGE_BRACKET_OPTIONS = ['16-20', '21-25', '26-30', '30+'] as const

const FEATURED_PAIN_IDS = [
	'email-chaos',
	'meal-planning',
	'expense-tracking',
	'social-posting',
	'job-applications',
	'copy-paste-hell',
]

const AI_COMFORT_OPTIONS = [
	{ value: 1, label: 'Never tried it', emoji: '\u{1F937}' },
	{ value: 2, label: 'Tried it a few times', emoji: '\u{1F914}' },
	{ value: 3, label: 'Use it weekly', emoji: '\u{1F4AA}' },
	{ value: 4, label: "Can't live without it", emoji: '\u{1F9E0}' },
] as const

const AI_TOOLS = [
	{ id: 'chatgpt', label: 'ChatGPT' },
	{ id: 'claude', label: 'Claude' },
	{ id: 'gemini', label: 'Gemini' },
	{ id: 'deepseek', label: 'DeepSeek' },
	{ id: 'copilot', label: 'Copilot' },
	{ id: 'none', label: 'None' },
] as const

const MAX_PAIN_PICKS = 3
const MIN_PAIN_PICKS = 2

export function QuickProfile({ onComplete }: QuickProfileProps) {
	const [step, setStep] = useState(0)
	const [transitioning, setTransitioning] = useState(false)
	const [occupation, setOccupation] = useState('')
	const [ageBracket, setAgeBracket] = useState('')
	const [painPicks, setPainPicks] = useState<string[]>([])
	const [aiComfort, setAiComfort] = useState(0)
	const [aiToolsUsed, setAiToolsUsed] = useState<string[]>([])

	const stepContainerRef = useRef<HTMLDivElement>(null)
	const [stepFocusTrigger, setStepFocusTrigger] = useState(0)

	const featuredPains = painLibrary.filter((p) => FEATURED_PAIN_IDS.includes(p.id))

	/** Focus the step heading after each step transition for a11y */
	// biome-ignore lint/correctness/useExhaustiveDependencies: stepFocusTrigger is an intentional re-run trigger
	useEffect(() => {
		if (stepContainerRef.current) {
			const heading = stepContainerRef.current.querySelector('h2, [tabindex]')
			if (heading instanceof HTMLElement) {
				heading.focus({ preventScroll: true })
			}
		}
	}, [stepFocusTrigger])

	function advanceStep(nextStep?: number) {
		setTransitioning(true)
		setTimeout(() => {
			setStep((s) => nextStep ?? s + 1)
			setTransitioning(false)
			setStepFocusTrigger((n) => n + 1)
		}, 250)
	}

	function selectOccupation(id: string) {
		setOccupation(id)
		setTimeout(() => advanceStep(1), 300)
	}

	function selectAgeBracket(value: string) {
		setAgeBracket(value)
		setTimeout(() => advanceStep(2), 300)
	}

	function togglePain(id: string) {
		setPainPicks((prev) => {
			if (prev.includes(id)) return prev.filter((p) => p !== id)
			if (prev.length >= MAX_PAIN_PICKS) return prev
			return [...prev, id]
		})
	}

	function selectComfort(value: number) {
		setAiComfort(value)
		setTimeout(() => advanceStep(4), 300)
	}

	function toggleTool(id: string) {
		setAiToolsUsed((prev) => {
			if (id === 'none') return prev.includes('none') ? [] : ['none']
			const without = prev.filter((t) => t !== 'none')
			if (without.includes(id)) return without.filter((t) => t !== id)
			return [...without, id]
		})
	}

	function handleDone() {
		onComplete({ occupation, ageBracket, painPicks, aiComfort, aiToolsUsed })
	}

	return (
		<VStack gap={6} width="100%" maxWidth="560px" marginInline="auto">
			{/* Dot indicators */}
			<Flex gap={2} justifyContent="center">
				{[0, 1, 2, 3, 4].map((i) => (
					<Box
						key={`step-${i}`}
						width={step === i ? '24px' : '8px'}
						height="8px"
						borderRadius="full"
						bg={i <= step ? 'primary' : 'outlineVariant/20'}
						transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
					/>
				))}
			</Flex>

			{/* Step container with slide animation */}
			<Box
				ref={stepContainerRef}
				width="100%"
				style={{
					animation: transitioning
						? 'slideOutToLeft 0.25s ease-in forwards'
						: 'slideInFromRight 0.35s ease-out both',
				}}
			>
				{/* Step 0: Occupation */}
				{step === 0 && (
					<VStack gap={5} width="100%">
						<VStack gap={2} textAlign="center">
							<styled.h2 tabIndex={-1} textStyle="heading.section" color="onSurface">
								What do you do?
							</styled.h2>
							<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
								Just the basics. No LinkedIn required.
							</styled.p>
						</VStack>

						<VStack gap={3} width="100%">
							{OCCUPATION_OPTIONS.map((opt, i) => {
								const isSelected = occupation === opt.id
								const IconComponent = opt.icon
								return (
									<styled.button
										key={opt.id}
										onClick={() => selectOccupation(opt.id)}
										display="flex"
										alignItems="center"
										gap={4}
										width="100%"
										padding={5}
										borderRadius="16px"
										border="2px solid"
										borderColor={isSelected ? 'primary' : 'outlineVariant/15'}
										bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
										cursor="pointer"
										transition="border-color 0.2s ease, background 0.2s ease"
										textAlign="left"
										_hover={{
											borderColor: isSelected ? 'primary' : 'outlineVariant/40',
											bg: isSelected ? 'primary/6' : 'surfaceContainer',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										aria-pressed={isSelected}
										style={{
											animation: isSelected
												? 'bouncySelect 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
												: `staggerFadeIn 0.4s ease-out ${i * 0.08}s both`,
										}}
									>
										<Box
											width="44px"
											height="44px"
											borderRadius="12px"
											bg={isSelected ? 'primary/10' : 'surfaceContainer'}
											display="flex"
											alignItems="center"
											justifyContent="center"
											flexShrink={0}
										>
											<IconComponent
												size={22}
												color={isSelected ? '#623153' : '#81737a'}
												strokeWidth={1.5}
											/>
										</Box>
										<VStack gap={0.5} alignItems="flex-start">
											<styled.span
												fontFamily="heading"
												fontWeight="600"
												fontSize="md"
												color="onSurface"
											>
												{opt.label}
											</styled.span>
											<styled.span fontSize="xs" color="onSurfaceVariant/60" lineHeight="1.4">
												{opt.subtitle}
											</styled.span>
										</VStack>
									</styled.button>
								)
							})}
						</VStack>
					</VStack>
				)}

				{/* Step 1: Age bracket */}
				{step === 1 && (
					<VStack gap={5} width="100%">
						<VStack gap={2} textAlign="center">
							<styled.h2 tabIndex={-1} textStyle="heading.section" color="onSurface">
								How old are you?
							</styled.h2>
							<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
								Helps us pick the right examples.
							</styled.p>
						</VStack>

						<Flex gap={3} flexWrap="wrap" justifyContent="center" width="100%">
							{AGE_BRACKET_OPTIONS.map((age, i) => {
								const isSelected = ageBracket === age
								return (
									<styled.button
										key={age}
										onClick={() => selectAgeBracket(age)}
										display="flex"
										alignItems="center"
										justifyContent="center"
										paddingInline={6}
										paddingBlock={3.5}
										borderRadius="full"
										border="2px solid"
										borderColor={isSelected ? 'primary' : 'outlineVariant/20'}
										bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
										color={isSelected ? 'primary' : 'onSurfaceVariant'}
										fontFamily="heading"
										fontWeight="600"
										fontSize="md"
										cursor="pointer"
										minWidth="80px"
										transition="border-color 0.2s ease, background 0.2s ease, transform 0.2s ease"
										_hover={{
											borderColor: isSelected ? 'primary' : 'outlineVariant/50',
											bg: isSelected ? 'primary/6' : 'surfaceContainer',
											transform: 'scale(1.05)',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										aria-pressed={isSelected}
										style={{
											animation: isSelected
												? 'bouncySelect 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
												: `staggerFadeIn 0.3s ease-out ${i * 0.05}s both`,
										}}
									>
										{age}
									</styled.button>
								)
							})}
						</Flex>
					</VStack>
				)}

				{/* Step 2: Pain tiles */}
				{step === 2 && (
					<VStack gap={5} width="100%">
						<VStack gap={2} textAlign="center">
							<styled.h2 tabIndex={-1} textStyle="heading.section" color="onSurface">
								What bugs you most?
							</styled.h2>
							<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
								Pick up to {MAX_PAIN_PICKS}. Be honest.
							</styled.p>
						</VStack>

						<Grid columns={{ base: 2, md: 3 }} gap={3} width="100%">
							{featuredPains.map((pain, i) => {
								const isSelected = painPicks.includes(pain.id)
								return (
									<styled.button
										key={pain.id}
										onClick={() => togglePain(pain.id)}
										display="flex"
										flexDirection="column"
										alignItems="flex-start"
										gap={2}
										padding={4}
										borderRadius="16px"
										border="2px solid"
										borderColor={isSelected ? 'primary' : 'outlineVariant/15'}
										bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
										cursor="pointer"
										transition="border-color 0.2s ease, background 0.2s ease"
										position="relative"
										textAlign="left"
										minHeight="120px"
										_hover={{
											borderColor: isSelected ? 'primary' : 'outlineVariant/40',
											bg: isSelected ? 'primary/6' : 'surfaceContainer',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										aria-pressed={isSelected}
										style={{
											animation: isSelected
												? 'bouncySelect 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
												: `staggerFadeIn 0.4s ease-out ${i * 0.06}s both`,
										}}
									>
										{/* Checkmark */}
										{isSelected && (
											<Box
												position="absolute"
												top={2}
												right={2}
												width="22px"
												height="22px"
												borderRadius="full"
												bg="primary"
												display="flex"
												alignItems="center"
												justifyContent="center"
											>
												<Check size={13} color="white" strokeWidth={3} />
											</Box>
										)}
										<styled.span fontSize="2xl">{pain.emoji}</styled.span>
										<VStack gap={0.5} alignItems="flex-start">
											<styled.span
												fontFamily="heading"
												fontWeight="700"
												fontSize="sm"
												color="onSurface"
												lineHeight="1.2"
											>
												{pain.title}
											</styled.span>
											<styled.span fontSize="xs" color="onSurfaceVariant/60" lineHeight="1.4">
												{pain.description}
											</styled.span>
										</VStack>
									</styled.button>
								)
							})}
						</Grid>

						{/* Bottom bar */}
						<Flex
							width="100%"
							justifyContent="space-between"
							alignItems="center"
							paddingBlockStart={2}
						>
							<styled.span textStyle="body.sm" color="onSurfaceVariant/60">
								{painPicks.length} of {MAX_PAIN_PICKS} picked
							</styled.span>
							<styled.button
								onClick={() => advanceStep(3)}
								disabled={painPicks.length < MIN_PAIN_PICKS}
								paddingInline={6}
								paddingBlock={3}
								borderRadius="12px"
								border="none"
								background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
								color="white"
								fontFamily="heading"
								fontWeight="700"
								fontSize="sm"
								cursor="pointer"
								transition="all 0.2s ease"
								_hover={{ opacity: 0.9 }}
								_disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
								style={
									painPicks.length >= MIN_PAIN_PICKS
										? { animation: 'pulseGlow 2s ease-in-out infinite' }
										: undefined
								}
							>
								Next
							</styled.button>
						</Flex>
					</VStack>
				)}

				{/* Step 3: AI Comfort */}
				{step === 3 && (
					<VStack gap={5} width="100%">
						<VStack gap={2} textAlign="center">
							<styled.h2 tabIndex={-1} textStyle="heading.section" color="onSurface">
								How AI-savvy are you?
							</styled.h2>
							<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
								No wrong answer. Just curious.
							</styled.p>
						</VStack>

						<VStack gap={3} width="100%">
							{AI_COMFORT_OPTIONS.map((opt, i) => {
								const isSelected = aiComfort === opt.value
								return (
									<styled.button
										key={opt.value}
										onClick={() => selectComfort(opt.value)}
										display="flex"
										alignItems="center"
										gap={4}
										width="100%"
										padding={5}
										borderRadius="16px"
										border="2px solid"
										borderColor={isSelected ? 'primary' : 'outlineVariant/15'}
										bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
										cursor="pointer"
										transition="border-color 0.2s ease, background 0.2s ease"
										textAlign="left"
										_hover={{
											borderColor: isSelected ? 'primary' : 'outlineVariant/40',
											bg: isSelected ? 'primary/6' : 'surfaceContainer',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										aria-pressed={isSelected}
										style={{
											animation: isSelected
												? 'bouncySelect 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
												: `staggerFadeIn 0.4s ease-out ${i * 0.08}s both`,
										}}
									>
										<styled.span fontSize="2xl">{opt.emoji}</styled.span>
										<styled.span
											fontFamily="heading"
											fontWeight="600"
											fontSize="md"
											color="onSurface"
										>
											{opt.label}
										</styled.span>
									</styled.button>
								)
							})}
						</VStack>
					</VStack>
				)}

				{/* Step 4: AI Tools */}
				{step === 4 && (
					<VStack gap={5} width="100%">
						<VStack gap={2} textAlign="center">
							<styled.h2 tabIndex={-1} textStyle="heading.section" color="onSurface">
								Which AI tools have you used?
							</styled.h2>
							<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
								Pick all that apply.
							</styled.p>
						</VStack>

						<Flex gap={3} flexWrap="wrap" justifyContent="center" width="100%">
							{AI_TOOLS.map((tool, i) => {
								const isSelected = aiToolsUsed.includes(tool.id)
								return (
									<styled.button
										key={tool.id}
										onClick={() => toggleTool(tool.id)}
										display="flex"
										alignItems="center"
										gap={2}
										paddingInline={5}
										paddingBlock={3}
										borderRadius="full"
										border="2px solid"
										borderColor={isSelected ? 'primary' : 'outlineVariant/20'}
										bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
										color={isSelected ? 'primary' : 'onSurfaceVariant'}
										fontFamily="heading"
										fontWeight="600"
										fontSize="sm"
										cursor="pointer"
										transition="border-color 0.2s ease, background 0.2s ease, transform 0.2s ease"
										_hover={{
											borderColor: isSelected ? 'primary' : 'outlineVariant/50',
											bg: isSelected ? 'primary/6' : 'surfaceContainer',
											transform: 'scale(1.05)',
										}}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										aria-pressed={isSelected}
										style={{
											animation: isSelected
												? 'bouncySelect 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
												: `staggerFadeIn 0.3s ease-out ${i * 0.05}s both`,
										}}
									>
										{isSelected && <Check size={14} strokeWidth={3} />}
										{tool.label}
									</styled.button>
								)
							})}
						</Flex>

						{/* Done button */}
						<Flex width="100%" justifyContent="center" paddingBlockStart={2}>
							<styled.button
								onClick={handleDone}
								disabled={aiToolsUsed.length === 0}
								paddingInline={8}
								paddingBlock={3}
								borderRadius="12px"
								border="none"
								background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
								color="white"
								fontFamily="heading"
								fontWeight="700"
								fontSize="sm"
								cursor="pointer"
								transition="all 0.2s ease"
								_hover={{ opacity: 0.9 }}
								_disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
								style={
									aiToolsUsed.length > 0
										? { animation: 'pulseGlow 2s ease-in-out infinite' }
										: undefined
								}
							>
								Done
							</styled.button>
						</Flex>
					</VStack>
				)}
			</Box>
		</VStack>
	)
}
