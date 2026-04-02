'use client'

/**
 * QuickProfile — Slots Machine variant.
 *
 * 5 slot rows on a dark board. Each answer locks into place.
 * Multi-select for pain points + AI tools. "Other" text input.
 * ADHD mode toggle with video placeholder.
 * On md+ screens: slot board left, options right (no scrolling).
 */

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Brain, Check, ChevronDown, Lock, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { painLibrary } from '@/entities/pain-points/model/data'
import { preloadOcr } from '@/features/discovery-flow/lib/ocr-client'

export type ProfileData = {
	occupation: string
	customOccupation?: string
	ageBracket: string
	painPicks: string[]
	customPain?: string
	aiComfort: number
	aiToolsUsed: string[]
}

type QuickProfileProps = {
	onComplete: (data: ProfileData) => void
}

type SlotConfig = {
	id: string
	label: string
	prompt: string
	mode: 'single' | 'multi'
	options: string[]
	hasOther?: boolean
	minPicks?: number
	maxPicks?: number
}

const SLOTS: SlotConfig[] = [
	{
		id: 'occupation',
		label: 'YOU ARE',
		prompt: 'What do you do?',
		mode: 'single',
		options: ['Student', 'Working', 'Freelance', 'Job hunting', 'Creator'],
		hasOther: true,
	},
	{
		id: 'age',
		label: 'AGE',
		prompt: 'How old are you?',
		mode: 'single',
		options: ['16-20', '21-25', '26-30', '31+'],
	},
	{
		id: 'pain',
		label: 'PAIN POINTS',
		prompt: 'What bugs you most? Pick 2-3.',
		mode: 'multi',
		options: painLibrary.slice(0, 6).map((p) => `${p.emoji} ${p.title}`),
		hasOther: true,
		minPicks: 2,
		maxPicks: 3,
	},
	{
		id: 'comfort',
		label: 'AI LEVEL',
		prompt: 'How AI-savvy are you?',
		mode: 'single',
		options: [
			'\u{1F937} Never tried',
			'\u{1F914} A few times',
			'\u{1F4AA} Weekly',
			"\u{1F9E0} Can't stop",
		],
	},
	{
		id: 'tools',
		label: 'AI TOOLS',
		prompt: 'Which AI tools have you tried?',
		mode: 'multi',
		options: ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Copilot'],
		minPicks: 1,
		maxPicks: 5,
	},
]

const COMFORT_MAP: Record<string, number> = {
	'\u{1F937} Never tried': 1,
	'\u{1F914} A few times': 2,
	'\u{1F4AA} Weekly': 3,
	"\u{1F9E0} Can't stop": 4,
}

type SlotState = { locked: boolean; value: string }

export function QuickProfile({ onComplete }: QuickProfileProps) {
	const [slotStates, setSlotStates] = useState<SlotState[]>(
		SLOTS.map(() => ({ locked: false, value: '' })),
	)
	const [activeSlot, setActiveSlot] = useState(0)
	const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())
	const [showOtherInput, setShowOtherInput] = useState(false)
	const [otherText, setOtherText] = useState('')
	const [adhdMode, setAdhdMode] = useState(false)
	const [boardExpanded, setBoardExpanded] = useState(true)
	const otherInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		preloadOcr()
	}, [])

	const config = SLOTS[activeSlot]
	const allLocked = slotStates.every((s) => s.locked)
	const lockedCount = slotStates.filter((s) => s.locked).length
	const comfortValue = slotStates[3].value
	const toolsSkipped = comfortValue.includes('Never tried')
	const visibleStepCount = toolsSkipped ? SLOTS.length - 1 : SLOTS.length

	// Respect prefers-reduced-motion — skip animation delays when motion is reduced
	const animDelay =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 0
			: 350

	function lockSingle(value: string) {
		const isNeverTriedAi = SLOTS[activeSlot].id === 'comfort' && value.includes('Never tried')

		setSlotStates((prev) =>
			prev.map((s, i) => {
				if (i === activeSlot) return { locked: true, value }
				// Auto-fill tools as "none" when user never tried AI
				if (isNeverTriedAi && SLOTS[i].id === 'tools') return { locked: true, value: 'None' }
				return s
			}),
		)
		setShowOtherInput(false)
		setOtherText('')

		if (!isNeverTriedAi) {
			setTimeout(() => setActiveSlot((a) => a + 1), animDelay)
		}
		// When "Never tried" — allLocked triggers handleDone via useEffect
	}

	function toggleMulti(option: string) {
		setMultiSelected((prev) => {
			const next = new Set(prev)
			if (next.has(option)) {
				next.delete(option)
			} else if (!config?.maxPicks || next.size < config.maxPicks) {
				next.add(option)
			}
			return next
		})
	}

	function lockMulti() {
		const value = [...multiSelected].join(', ')
		setSlotStates((prev) => prev.map((s, i) => (i === activeSlot ? { locked: true, value } : s)))
		setMultiSelected(new Set())
		setShowOtherInput(false)
		setOtherText('')
		setTimeout(() => setActiveSlot((a) => a + 1), animDelay)
	}

	function handleOtherSubmit() {
		if (!otherText.trim()) return
		if (config?.mode === 'single') {
			lockSingle(otherText.trim())
		} else {
			setMultiSelected((prev) => new Set([...prev, otherText.trim()]))
			setOtherText('')
			setShowOtherInput(false)
		}
	}

	function handleDone() {
		const occupation = slotStates[0].value
		const isCustomOccupation = !SLOTS[0].options.includes(occupation)
		const ageBracket = slotStates[1].value
		const painRaw = slotStates[2].value.split(', ')
		const painPicks = painRaw
			.map((p) => {
				const match = painLibrary.find((lib) => `${lib.emoji} ${lib.title}` === p)
				return match?.id ?? p
			})
			.filter(Boolean)
		const customPains = painRaw.filter(
			(p) => !painLibrary.some((lib) => `${lib.emoji} ${lib.title}` === p),
		)
		const comfortValue = COMFORT_MAP[slotStates[3].value] ?? 1
		const tools = slotStates[4].value.split(', ').map((t) => t.toLowerCase())

		onComplete({
			occupation: isCustomOccupation ? 'other' : occupation.toLowerCase(),
			customOccupation: isCustomOccupation ? occupation : undefined,
			ageBracket,
			painPicks,
			customPain: customPains.length > 0 ? customPains.join(', ') : undefined,
			aiComfort: comfortValue,
			aiToolsUsed: tools,
		})
	}

	const canLockMulti = config?.mode === 'multi' && multiSelected.size >= (config.minPicks ?? 1)

	const handleDoneRef = useRef(handleDone)
	handleDoneRef.current = handleDone

	// Auto-complete when all slots are locked
	useEffect(() => {
		if (allLocked) handleDoneRef.current()
	}, [allLocked])

	return (
		<VStack gap={4} width="100%">
			{/* Top bar: step counter + ADHD toggle */}
			<Flex width="100%" justifyContent="space-between" alignItems="center">
				<styled.span
					fontSize="xs"
					fontWeight="600"
					color="onSurfaceVariant/40"
					textTransform="uppercase"
					letterSpacing="0.06em"
					data-testid="step-counter"
				>
					Step {Math.min(activeSlot + 1, visibleStepCount)} of {visibleStepCount}
				</styled.span>
				<styled.button
					onClick={() => setAdhdMode((v) => !v)}
					display="flex"
					alignItems="center"
					gap={1.5}
					paddingInline={3}
					paddingBlock="6px"
					borderRadius="full"
					border="1.5px solid"
					borderColor={adhdMode ? 'primary/30' : 'outlineVariant/20'}
					bg={adhdMode ? 'primary/8' : 'transparent'}
					color={adhdMode ? 'primary' : 'onSurfaceVariant/50'}
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					cursor="pointer"
					transition="all 0.2s ease"
					_hover={{ borderColor: 'primary/40' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					aria-pressed={adhdMode}
					data-testid="adhd-toggle"
				>
					<Brain size={12} />
					ADHD mode
				</styled.button>
			</Flex>

			{/* ADHD video placeholder */}
			{adhdMode && (
				<Box
					width="100%"
					borderRadius="14px"
					overflow="hidden"
					border="1px solid"
					borderColor="outlineVariant/10"
					position="relative"
					style={{
						aspectRatio: '21/9',
						maxHeight: '140px',
						animation: 'meldarFadeSlideUp 0.3s ease-out both',
					}}
				>
					<Box
						position="absolute"
						inset={0}
						background="linear-gradient(135deg, #623153, #874a72, #FFB876, #874a72, #623153)"
						backgroundSize="400% 400%"
						style={{ animation: 'focusVideoGradient 6s ease infinite' }}
					/>
					<Flex position="absolute" inset={0} alignItems="center" justifyContent="center">
						<styled.span fontSize="xs" color="white/25" fontWeight="500">
							satisfying video goes here
						</styled.span>
					</Flex>
				</Box>
			)}

			{/* Main area: md+ = side by side, mobile = stacked */}
			<Flex
				width="100%"
				gap={4}
				flexDir={{ base: 'column', md: 'row' }}
				alignItems={{ base: 'stretch', md: 'flex-start' }}
			>
				{/* LEFT: Slot board */}
				<Box
					width={{ base: '100%', md: '240px' }}
					flexShrink={0}
					padding={4}
					borderRadius="16px"
					bg="inverseSurface"
					boxShadow="0 4px 24px rgba(0, 0, 0, 0.15)"
					position={{ base: 'relative', md: 'sticky' }}
					top={{ md: '100px' }}
				>
					{/* Collapse toggle on mobile when some are locked */}
					{lockedCount > 0 && (
						<styled.button
							onClick={() => setBoardExpanded((v) => !v)}
							display={{ base: 'flex', md: 'none' }}
							alignItems="center"
							justifyContent="space-between"
							width="100%"
							bg="transparent"
							border="none"
							cursor="pointer"
							paddingBlock={1}
							marginBlockEnd={boardExpanded ? 2 : 0}
						>
							<styled.span fontSize="xs" color="white/40">
								{lockedCount}/{SLOTS.length} locked
							</styled.span>
							<ChevronDown
								size={14}
								color="rgba(255,255,255,0.3)"
								style={{
									transform: boardExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
									transition: 'transform 0.2s ease',
								}}
							/>
						</styled.button>
					)}

					{/* Slot rows — always visible on md+, collapsible on mobile */}
					<VStack gap={1.5} display={{ base: boardExpanded ? 'flex' : 'none', md: 'flex' }}>
						{SLOTS.map((slot, i) => {
							const state = slotStates[i]
							const isActive = i === activeSlot && !allLocked
							return (
								<Flex
									key={slot.id}
									width="100%"
									alignItems="center"
									gap={2}
									paddingInline={3}
									paddingBlock={2}
									borderRadius="8px"
									bg={state.locked ? 'white/6' : isActive ? 'white/4' : 'white/1'}
									border="1px solid"
									borderColor={state.locked ? 'primary/30' : isActive ? 'white/10' : 'transparent'}
									transition="all 0.2s ease"
									style={state.locked ? { animation: 'bouncySelect 0.25s ease' } : undefined}
								>
									<styled.span
										fontSize="10px"
										fontWeight="700"
										color={state.locked ? '#FFB876' : isActive ? 'white/40' : 'white/15'}
										textTransform="uppercase"
										letterSpacing="0.08em"
										width="65px"
										flexShrink={0}
										data-testid={`slot-label-${slot.id}`}
									>
										{slot.label}
									</styled.span>
									<styled.span
										flex={1}
										fontSize="xs"
										fontWeight={state.locked ? '600' : '400'}
										fontFamily="heading"
										color={state.locked ? 'white/90' : 'white/15'}
										overflow="hidden"
										textOverflow="ellipsis"
										whiteSpace="nowrap"
									>
										{state.locked ? state.value : isActive ? '\u25B6' : '\u2022\u2022\u2022'}
									</styled.span>
									{state.locked && <Lock size={10} color="#FFB876" />}
								</Flex>
							)
						})}
					</VStack>

					{/* Progress bar */}
					<Box width="100%" marginBlockStart={3}>
						<Box width="100%" height="3px" borderRadius="full" bg="white/6">
							<Box
								height="100%"
								borderRadius="full"
								background="linear-gradient(90deg, #623153, #FFB876)"
								transition="width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
								style={{ width: `${(lockedCount / SLOTS.length) * 100}%` }}
							/>
						</Box>
					</Box>
				</Box>

				{/* RIGHT: Options panel */}
				<Box flex={1} minWidth={0}>
					{!allLocked && config && (
						<VStack
							gap={4}
							width="100%"
							style={{ animation: 'meldarFadeSlideUp 0.25s ease-out both' }}
						>
							<VStack gap={1}>
								<styled.span
									fontSize="xs"
									fontWeight="700"
									color="primary"
									textTransform="uppercase"
									letterSpacing="0.08em"
								>
									{config.label}
								</styled.span>
								<styled.h2
									fontFamily="heading"
									fontSize={{ base: 'lg', md: 'xl' }}
									fontWeight="800"
									color="onSurface"
									lineHeight="1.2"
									data-testid="step-prompt"
								>
									{config.prompt}
								</styled.h2>
							</VStack>

							<Flex gap={2} flexWrap="wrap">
								{config.options.map((opt) => {
									const isSelected = config.mode === 'multi' ? multiSelected.has(opt) : false
									return (
										<styled.button
											key={opt}
											onClick={() =>
												config.mode === 'single' ? lockSingle(opt) : toggleMulti(opt)
											}
											display="flex"
											alignItems="center"
											gap={2}
											paddingInline={4}
											paddingBlock={3}
											borderRadius="14px"
											border="2px solid"
											borderColor={isSelected ? 'primary' : 'outlineVariant/15'}
											bg={isSelected ? 'primary/8' : 'surfaceContainerLowest'}
											fontFamily="heading"
											fontWeight="600"
											fontSize="sm"
											color={isSelected ? 'primary' : 'onSurface'}
											cursor="pointer"
											transition="all 0.15s ease"
											_hover={{
												borderColor: 'primary/40',
												transform: 'scale(1.03)',
												boxShadow: '0 2px 8px rgba(98, 49, 83, 0.08)',
											}}
											_focusVisible={{
												outline: '2px solid',
												outlineColor: 'primary',
												outlineOffset: '2px',
											}}
											aria-pressed={isSelected}
											style={isSelected ? { animation: 'bouncySelect 0.25s ease' } : undefined}
											data-testid={`option-${opt
												.replace(/[^\w]+/g, '-')
												.replace(/^-|-$/g, '')
												.toLowerCase()}`}
										>
											{isSelected && <Check size={14} strokeWidth={3} />}
											{opt}
										</styled.button>
									)
								})}

								{/* "Other" button */}
								{config.hasOther && !showOtherInput && (
									<styled.button
										onClick={() => {
											setShowOtherInput(true)
											setTimeout(() => otherInputRef.current?.focus(), 100)
										}}
										display="flex"
										alignItems="center"
										gap={1.5}
										paddingInline={4}
										paddingBlock={3}
										borderRadius="14px"
										border="2px dashed"
										borderColor="outlineVariant/20"
										bg="transparent"
										fontFamily="heading"
										fontWeight="500"
										fontSize="sm"
										color="onSurfaceVariant/50"
										cursor="pointer"
										_hover={{ borderColor: 'primary/30', color: 'primary' }}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
										data-testid="option-something-else"
									>
										<PenLine size={14} />
										Something else
									</styled.button>
								)}
							</Flex>

							{/* "Other" text input */}
							{showOtherInput && (
								<Flex
									gap={2}
									width="100%"
									style={{ animation: 'meldarFadeSlideUp 0.2s ease-out both' }}
								>
									<styled.input
										ref={otherInputRef}
										value={otherText}
										onChange={(e) => setOtherText(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault()
												handleOtherSubmit()
											}
										}}
										flex={1}
										paddingInline={4}
										paddingBlock={3}
										borderRadius="14px"
										border="2px solid"
										borderColor="primary/30"
										bg="surfaceContainerLowest"
										fontSize="sm"
										fontFamily="heading"
										color="onSurface"
										placeholder={
											config.mode === 'single' ? 'Type your answer...' : 'Add a custom option...'
										}
										_focus={{ borderColor: 'primary' }}
										_placeholder={{ color: 'onSurface/30' }}
									/>
									<styled.button
										onClick={handleOtherSubmit}
										disabled={!otherText.trim()}
										paddingInline={4}
										paddingBlock={3}
										borderRadius="14px"
										border="none"
										bg="primary"
										color="white"
										fontFamily="heading"
										fontWeight="700"
										fontSize="sm"
										cursor="pointer"
										_hover={{ opacity: 0.9 }}
										_disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
										_focusVisible={{
											outline: '2px solid',
											outlineColor: 'primary',
											outlineOffset: '2px',
										}}
									>
										{config.mode === 'single' ? 'Lock in' : 'Add'}
									</styled.button>
								</Flex>
							)}

							{/* Lock button for multi-select */}
							{config.mode === 'multi' && (
								<styled.button
									onClick={lockMulti}
									disabled={!canLockMulti}
									width="100%"
									paddingBlock={3}
									borderRadius="14px"
									border="none"
									background={
										canLockMulti
											? 'linear-gradient(135deg, #623153, #FFB876)'
											: 'surfaceContainerHighest'
									}
									color={canLockMulti ? 'white' : 'onSurface/30'}
									fontFamily="heading"
									fontWeight="700"
									fontSize="sm"
									cursor={canLockMulti ? 'pointer' : 'not-allowed'}
									transition="all 0.2s ease"
									boxShadow={canLockMulti ? '0 4px 16px rgba(98, 49, 83, 0.2)' : 'none'}
									_hover={canLockMulti ? { opacity: 0.9 } : {}}
									_focusVisible={{
										outline: '2px solid',
										outlineColor: 'primary',
										outlineOffset: '2px',
									}}
									style={
										canLockMulti ? { animation: 'pulseGlow 2s ease-in-out infinite' } : undefined
									}
									data-testid="lock-button"
								>
									<Flex alignItems="center" justifyContent="center" gap={2}>
										<Lock size={16} />
										Lock in {multiSelected.size} pick{multiSelected.size !== 1 ? 's' : ''}
									</Flex>
								</styled.button>
							)}
						</VStack>
					)}
				</Box>
			</Flex>
		</VStack>
	)
}
