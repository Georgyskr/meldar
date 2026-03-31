'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Check, ChevronDown, ChevronUp, type LucideIcon, Play, Upload, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

type UploadCardProps = {
	title: string
	description: string
	timeEstimate: string
	accept: string
	icon: LucideIcon
	status: UploadStatus
	progress?: number
	errorMessage?: string
	onFile: (file: File) => void
	instructions: ReactNode
}

export function UploadCard({
	title,
	description,
	timeEstimate,
	accept,
	icon: Icon,
	status,
	progress,
	errorMessage,
	onFile,
	instructions,
}: UploadCardProps) {
	const [showGuide, setShowGuide] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (file) onFile(file)
	}

	const isDone = status === 'done'
	const isActive = status === 'uploading' || status === 'processing'
	const isError = status === 'error'

	return (
		<Box
			width="100%"
			borderRadius="16px"
			border="2px solid"
			borderColor={isDone ? 'primary/30' : isError ? 'red.300' : 'outlineVariant/15'}
			bg={isDone ? 'primary/4' : 'surfaceContainerLowest'}
			overflow="hidden"
			transition="all 0.3s ease"
		>
			<VStack gap={3} padding={5} alignItems="stretch">
				{/* Header row */}
				<Flex gap={3} alignItems="center">
					<Box
						width="44px"
						height="44px"
						borderRadius="12px"
						bg={isDone ? 'primary/10' : 'surfaceContainer'}
						display="flex"
						alignItems="center"
						justifyContent="center"
						flexShrink={0}
					>
						{isDone ? (
							<Check size={22} color="#623153" strokeWidth={2.5} />
						) : (
							<Icon size={22} color={isActive ? '#623153' : '#81737a'} strokeWidth={1.5} />
						)}
					</Box>

					<VStack gap={0.5} flex={1} alignItems="flex-start">
						<Flex gap={2} alignItems="center">
							<styled.span fontFamily="heading" fontWeight="700" fontSize="sm" color="onSurface">
								{title}
							</styled.span>
							{isDone && (
								<styled.span
									fontSize="xs"
									fontWeight="600"
									color="primary"
									bg="primary/8"
									paddingInline={2}
									paddingBlock={0.5}
									borderRadius="md"
								>
									Analyzed
								</styled.span>
							)}
						</Flex>
						<styled.span fontSize="xs" color="onSurfaceVariant/60">
							{description}
						</styled.span>
					</VStack>

					<styled.span fontSize="xs" fontWeight="500" color="onSurfaceVariant/50" flexShrink={0}>
						{timeEstimate}
					</styled.span>
				</Flex>

				{/* Upload progress */}
				{isActive && (
					<Box width="100%">
						<Box
							width="100%"
							height="4px"
							borderRadius="full"
							bg="outlineVariant/12"
							overflow="hidden"
						>
							<Box
								height="100%"
								borderRadius="full"
								background="linear-gradient(90deg, #623153, #FFB876)"
								transition="width 0.3s ease"
								style={{ width: progress != null ? `${progress}%` : '60%' }}
							/>
						</Box>
						<styled.span
							fontSize="xs"
							color="primary"
							fontWeight="500"
							marginBlockStart={1}
							display="block"
							style={{ animation: 'gentleBreathe 1.5s ease-in-out infinite' }}
						>
							{status === 'uploading' ? 'Uploading...' : 'Analyzing...'}
						</styled.span>
					</Box>
				)}

				{/* Error */}
				{isError && (
					<Flex gap={2} alignItems="center">
						<X size={14} color="#ef4444" />
						<styled.span fontSize="xs" color="red.500" fontWeight="500">
							{errorMessage || 'Something went wrong. Try again.'}
						</styled.span>
					</Flex>
				)}

				{/* Upload button (idle or error) */}
				{(status === 'idle' || isError) && (
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
							accept={accept}
							onChange={handleFileChange}
							style={{ display: 'none' }}
						/>
						<Upload size={15} />
						{isError ? 'Try again' : 'Upload'}
					</styled.label>
				)}

				{/* How to export toggle */}
				<styled.button
					onClick={() => setShowGuide((v) => !v)}
					display="flex"
					alignItems="center"
					justifyContent="center"
					gap={1}
					width="100%"
					bg="transparent"
					border="none"
					cursor="pointer"
					fontSize="xs"
					fontWeight="500"
					color="onSurfaceVariant/50"
					paddingBlock={1}
					transition="color 0.15s ease"
					_hover={{ color: 'primary' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					{showGuide ? 'Hide instructions' : 'How to export'}
					{showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
				</styled.button>
			</VStack>

			{/* Collapsible instructions */}
			{showGuide && (
				<Box
					paddingInline={5}
					paddingBlockEnd={5}
					style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
				>
					<VStack gap={3} alignItems="stretch">
						{instructions}

						{/* Video placeholder */}
						<Box
							width="100%"
							borderRadius="12px"
							bg="surfaceContainerHigh"
							overflow="hidden"
							position="relative"
							style={{ aspectRatio: '16/9' }}
						>
							<Flex position="absolute" inset={0} alignItems="center" justifyContent="center">
								<Box
									width="48px"
									height="48px"
									borderRadius="full"
									bg="primary/80"
									display="flex"
									alignItems="center"
									justifyContent="center"
								>
									<Play size={20} color="white" fill="white" />
								</Box>
							</Flex>
						</Box>
						<styled.span fontSize="xs" color="onSurfaceVariant/50" textAlign="center">
							Watch the 30-second tutorial
						</styled.span>
					</VStack>
				</Box>
			)}
		</Box>
	)
}
