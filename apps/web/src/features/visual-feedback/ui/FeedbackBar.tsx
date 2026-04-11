'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { Paperclip, Send } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Text } from '@/shared/ui/typography'

export type FeedbackRequest = {
	readonly instruction: string
	readonly referenceUrl?: string
	readonly referenceImage?: File
}

type Props = {
	readonly onSubmit: (request: FeedbackRequest) => Promise<void>
}

const STITCH_KEYWORDS = [
	'logo',
	'brand',
	'colors',
	'color palette',
	'hero image',
	'icon',
	'design',
	'font',
	'typography',
	'illustration',
	'banner',
]

const SHORT_INSTRUCTION_SUGGESTIONS: Record<string, string[]> = {
	default: ['Bolder colors?', 'Bigger text?', 'More spacing?'],
}

const MIN_WORD_COUNT_FOR_DIRECT_SUBMIT = 5
const TEXTAREA_MAX_HEIGHT_PX = 96

function containsDesignKeyword(text: string): boolean {
	const lower = text.toLowerCase()
	return STITCH_KEYWORDS.some((kw) => lower.includes(kw))
}

function isShortInstruction(text: string): boolean {
	return text.trim().split(/\s+/).length < MIN_WORD_COUNT_FOR_DIRECT_SUBMIT
}

function getSuggestionChips(): string[] {
	return SHORT_INSTRUCTION_SUGGESTIONS.default
}

export function FeedbackBar({ onSubmit }: Props) {
	const [instruction, setInstruction] = useState('')
	const [referenceUrl, setReferenceUrl] = useState('')
	const [referenceImage, setReferenceImage] = useState<File | null>(null)
	const [showAttach, setShowAttach] = useState(false)
	const [showChips, setShowChips] = useState(false)
	const [chips, setChips] = useState<string[]>([])
	const [submitting, setSubmitting] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const autoResize = useCallback(() => {
		const el = textareaRef.current
		if (!el) return
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`
	}, [])

	const handleTextareaChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInstruction(e.target.value)
			setShowChips(false)
			autoResize()
		},
		[autoResize],
	)

	const handleChipClick = useCallback(
		(chip: string) => {
			const updated = instruction.trim() ? `${instruction.trim()} ${chip}` : chip
			setInstruction(updated)
			setShowChips(false)
			textareaRef.current?.focus()
		},
		[instruction],
	)

	const handleSubmit = useCallback(async () => {
		const trimmed = instruction.trim()
		if (!trimmed || submitting) return

		if (isShortInstruction(trimmed) && !showChips) {
			setChips(getSuggestionChips())
			setShowChips(true)
			return
		}

		setSubmitting(true)
		try {
			await onSubmit({
				instruction: trimmed,
				referenceUrl: referenceUrl.trim() || undefined,
				referenceImage: referenceImage ?? undefined,
			})
			setInstruction('')
			setReferenceUrl('')
			setReferenceImage(null)
			setShowChips(false)
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto'
			}
		} finally {
			setSubmitting(false)
		}
	}, [instruction, submitting, showChips, onSubmit, referenceUrl, referenceImage])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit()
			}
		},
		[handleSubmit],
	)

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null
		setReferenceImage(file)
	}, [])

	const showStitchSuggestion = containsDesignKeyword(instruction)
	const sendDisabled = instruction.trim().length === 0 || submitting

	return (
		<Box
			insetInlineStart={0}
			insetInlineEnd={0}
			zIndex={100}
			bg="surface"
			borderBlockStart="1px solid"
			borderColor="outlineVariant/40"
			paddingBlock={3}
			paddingInline={4}
		>
			<Flex direction="column" gap={2} maxWidth="720px" marginInline="auto">
				<Text as="p" textStyle="label.sm" color="onSurfaceVariant">
					Click any element above to change it, or describe what you want
				</Text>

				{showStitchSuggestion && (
					<Box paddingBlock={2} paddingInline={3} bg="outlineVariant/10" borderRadius="sm">
						<Text as="span" textStyle="body.sm" color="onSurfaceVariant">
							Need design assets?{' '}
							<a
								href="https://stitch.withgoogle.com/"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: 'inherit', textDecoration: 'underline' }}
							>
								Try Stitch — it's free
							</a>
						</Text>
					</Box>
				)}

				{showChips && (
					<Flex gap={2} flexWrap="wrap" role="group" aria-label="Suggestion chips">
						{chips.map((chip) => (
							<styled.button
								key={chip}
								type="button"
								onClick={() => handleChipClick(chip)}
								paddingBlock={1}
								paddingInline={3}
								bg="outlineVariant/20"
								borderRadius="full"
								border="1px solid"
								borderColor="outlineVariant/40"
								cursor="pointer"
								_hover={{ bg: 'outlineVariant/30' }}
							>
								<Text as="span" textStyle="body.sm" color="onSurface">
									{chip}
								</Text>
							</styled.button>
						))}
					</Flex>
				)}

				<Flex gap={2} alignItems="flex-end">
					<styled.button
						type="button"
						aria-label="Attach reference"
						onClick={() => setShowAttach((prev) => !prev)}
						display="inline-flex"
						alignItems="center"
						justifyContent="center"
						width="36px"
						height="36px"
						flexShrink={0}
						bg="transparent"
						border="1px solid"
						borderColor="outlineVariant/40"
						borderRadius="md"
						cursor="pointer"
						color="onSurfaceVariant"
						_hover={{ bg: 'outlineVariant/10' }}
					>
						<Paperclip size={16} />
					</styled.button>

					<Box flex={1}>
						<textarea
							ref={textareaRef}
							value={instruction}
							onChange={handleTextareaChange}
							onKeyDown={handleKeyDown}
							placeholder='e.g. "make the button pink" or "change price to 50"'
							disabled={submitting}
							rows={1}
							style={{
								width: '100%',
								minHeight: '36px',
								maxHeight: `${TEXTAREA_MAX_HEIGHT_PX}px`,
								padding: '8px 12px',
								border: '1px solid',
								borderColor: 'var(--colors-outline-variant)',
								borderRadius: '6px',
								fontFamily: 'var(--fonts-body)',
								fontSize: '14px',
								lineHeight: '1.5',
								resize: 'none',
								overflow: 'auto',
								background: 'transparent',
							}}
						/>
					</Box>

					<styled.button
						type="button"
						aria-label="Send feedback"
						onClick={handleSubmit}
						disabled={sendDisabled}
						display="inline-flex"
						alignItems="center"
						justifyContent="center"
						width="36px"
						height="36px"
						flexShrink={0}
						bg={sendDisabled ? 'outlineVariant/20' : 'primary'}
						color={sendDisabled ? 'onSurfaceVariant' : 'onPrimary'}
						border="none"
						borderRadius="md"
						cursor={sendDisabled ? 'not-allowed' : 'pointer'}
						opacity={sendDisabled ? 0.5 : 1}
						_hover={sendDisabled ? {} : { bg: 'primary/90' }}
					>
						<Send size={16} />
					</styled.button>
				</Flex>

				{showAttach && (
					<Flex
						direction="column"
						gap={2}
						paddingBlock={3}
						paddingInline={3}
						bg="outlineVariant/10"
						borderRadius="sm"
					>
						<Flex direction="column" gap={1}>
							<Text as="span" textStyle="label.sm" color="onSurfaceVariant">
								Reference URL
							</Text>
							<input
								type="url"
								value={referenceUrl}
								onChange={(e) => setReferenceUrl(e.target.value)}
								placeholder="https://example.com/inspiration"
								style={{
									width: '100%',
									padding: '6px 10px',
									border: '1px solid',
									borderColor: 'var(--colors-outline-variant)',
									borderRadius: '4px',
									fontFamily: 'var(--fonts-body)',
									fontSize: '13px',
									background: 'transparent',
								}}
							/>
						</Flex>
						<Flex direction="column" gap={1}>
							<Text as="span" textStyle="label.sm" color="onSurfaceVariant">
								Reference image
							</Text>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleFileChange}
								style={{ fontSize: '13px' }}
							/>
							{referenceImage && (
								<Text as="span" textStyle="body.xs" color="onSurfaceVariant">
									{referenceImage.name}
								</Text>
							)}
						</Flex>
					</Flex>
				)}
			</Flex>
		</Box>
	)
}
