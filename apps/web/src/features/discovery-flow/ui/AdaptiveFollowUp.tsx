'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import { Check, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Heading, Text } from '@/shared/ui'
import type { AdaptiveFollowUpItem } from '../model/atoms'
import { adaptiveAnswersAtom } from '../model/atoms'

type AdaptiveFollowUpProps = {
	followUps: AdaptiveFollowUpItem[]
	sessionId: string
	onComplete: (answers: Record<string, string>) => void
}

function ScreenshotCard({
	item,
	sessionId,
	index,
}: {
	item: AdaptiveFollowUpItem
	sessionId: string
	index: number
}) {
	const fileRef = useRef<HTMLInputElement>(null)
	const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

	async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setStatus('uploading')

		try {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('platform', 'adaptive')
			formData.append('sessionId', sessionId)

			const res = await fetch('/api/discovery/upload', {
				method: 'POST',
				body: formData,
			})

			setStatus(res.ok ? 'done' : 'error')
		} catch {
			setStatus('error')
		}

		if (e.target) e.target.value = ''
	}

	return (
		<Box
			width="100%"
			borderRadius="16px"
			border="2px solid"
			borderColor={status === 'done' ? 'primary/30' : 'outlineVariant/15'}
			bg={status === 'done' ? 'primary/4' : 'surfaceContainerLowest'}
			overflow="hidden"
			transition="all 0.3s ease"
			style={{ animation: `staggerFadeIn 0.4s ease-out ${0.15 + index * 0.12}s both` }}
		>
			<VStack gap={3} padding={5} alignItems="stretch">
				<VStack gap={1} alignItems="flex-start">
					{item.appName && (
						<Text textStyle="tertiary.lg" color="primary">
							{item.appName}
						</Text>
					)}
					<Text textStyle="primary.xs" color="onSurface">
						{item.title}
					</Text>
					<Text textStyle="secondary.sm" color="onSurfaceVariant/70">
						{item.description}
					</Text>
				</VStack>

				{status === 'done' ? (
					<Flex gap={2} alignItems="center" justifyContent="center" paddingBlock={2}>
						<Check size={16} color="#623153" strokeWidth={2.5} />
						<Text textStyle="primary.xs" color="primary">
							Uploaded
						</Text>
					</Flex>
				) : (
					<styled.label
						display="flex"
						alignItems="center"
						justifyContent="center"
						gap={2}
						paddingBlock={2.5}
						borderRadius="10px"
						border="1.5px dashed"
						borderColor="outlineVariant/25"
						bg="surfaceContainer/40"
						cursor="pointer"
						fontSize="sm"
						fontWeight="600"
						fontFamily="heading"
						color="primary"
						minHeight="48px"
						transition="all 0.2s ease"
						_hover={{ bg: 'primary/4', borderColor: 'primary/30' }}
						_focusWithin={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
					>
						<input
							ref={fileRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							aria-label={`Upload screenshot for ${item.title}`}
							onChange={handleFile}
							style={{ display: 'none' }}
						/>
						<Upload size={15} />
						{status === 'uploading'
							? 'Uploading...'
							: status === 'error'
								? 'Try again'
								: 'Upload screenshot'}
					</styled.label>
				)}
			</VStack>
		</Box>
	)
}

function QuestionCard({ item, index }: { item: AdaptiveFollowUpItem; index: number }) {
	const [answers, setAnswers] = useAtom(adaptiveAnswersAtom)
	const selected = answers[item.id] ?? null

	function handleSelect(option: string) {
		setAnswers((prev) => ({ ...prev, [item.id]: option }))
	}

	return (
		<Box
			width="100%"
			borderRadius="16px"
			border="2px solid"
			borderColor={selected ? 'primary/30' : 'outlineVariant/15'}
			bg={selected ? 'primary/4' : 'surfaceContainerLowest'}
			overflow="hidden"
			transition="all 0.3s ease"
			style={{ animation: `staggerFadeIn 0.4s ease-out ${0.15 + index * 0.12}s both` }}
		>
			<VStack gap={3} padding={5} alignItems="stretch">
				<VStack gap={1} alignItems="flex-start">
					<Text textStyle="primary.xs" color="onSurface">
						{item.title}
					</Text>
					<Text textStyle="secondary.sm" color="onSurfaceVariant/70">
						{item.description}
					</Text>
				</VStack>

				<Flex gap={2} flexWrap="wrap">
					{(item.options ?? []).map((option) => {
						const isSelected = selected === option
						return (
							<styled.button
								key={option}
								onClick={() => handleSelect(option)}
								aria-pressed={isSelected}
								paddingInline={4}
								paddingBlock={2.5}
								borderRadius="10px"
								border="1.5px solid"
								borderColor={isSelected ? 'primary' : 'outlineVariant/25'}
								bg={isSelected ? 'primary/10' : 'surfaceContainer/40'}
								cursor="pointer"
								fontSize="sm"
								fontWeight={isSelected ? '600' : '400'}
								fontFamily="body"
								color={isSelected ? 'primary' : 'onSurface'}
								minHeight="48px"
								transition="all 0.2s ease"
								_hover={{ bg: isSelected ? 'primary/12' : 'primary/4', borderColor: 'primary/30' }}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
							>
								{option}
							</styled.button>
						)
					})}
				</Flex>
			</VStack>
		</Box>
	)
}

export function AdaptiveFollowUp({ followUps, sessionId, onComplete }: AdaptiveFollowUpProps) {
	const [answers] = useAtom(adaptiveAnswersAtom)

	function handleGenerate() {
		onComplete(answers)
	}

	return (
		<VStack
			gap={6}
			width="100%"
			maxWidth="640px"
			marginInline="auto"
			style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
		>
			{/* Header */}
			<VStack gap={2} textAlign="center">
				<Heading textStyle="primary.lg" color="onSurface">
					A few more questions
				</Heading>
				<Text as="p" textStyle="secondary.xl" color="onSurfaceVariant/70">
					Based on your screen time, these will sharpen your results
				</Text>
			</VStack>

			{/* Follow-up cards */}
			<VStack gap={4} width="100%">
				{followUps.map((item, i) =>
					item.type === 'screenshot' ? (
						<ScreenshotCard key={item.id} item={item} sessionId={sessionId} index={i} />
					) : (
						<QuestionCard key={item.id} item={item} index={i} />
					),
				)}
			</VStack>

			{/* CTA */}
			<VStack gap={3} width="100%" maxWidth="400px" marginInline="auto" paddingBlockStart={2}>
				<styled.button
					onClick={handleGenerate}
					width="100%"
					paddingBlock={3.5}
					paddingInline={6}
					borderRadius="14px"
					border="none"
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					cursor="pointer"
					minHeight="48px"
					transition="all 0.2s ease"
					boxShadow="0 4px 20px rgba(98, 49, 83, 0.25)"
					_hover={{ opacity: 0.9 }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					Generate my results
				</styled.button>
			</VStack>
		</VStack>
	)
}
