'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Check, ChevronDown, ChevronUp, Clock, type LucideIcon, Upload, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'waiting' | 'error'

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
	/** Whether this source is a delayed export (shows "I started the export" button) */
	isDelayed?: boolean
	/** Called when user marks a delayed source as "export started" */
	onExportStarted?: () => void
	/** Called when user says they have the file ready (from waiting state) */
	onFileReady?: () => void
	/** Maximum number of files this source accepts (defaults to 1) */
	maxFiles?: number
	/** Number of files already uploaded for this source */
	uploadCount?: number
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
	isDelayed,
	onExportStarted,
	onFileReady,
	maxFiles = 1,
	uploadCount = 0,
}: UploadCardProps) {
	const [showGuide, setShowGuide] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (file) onFile(file)
		if (e.target) e.target.value = ''
	}

	const hasMultiFile = maxFiles > 1
	const isPartiallyDone = hasMultiFile && uploadCount > 0 && uploadCount < maxFiles
	const isFullyDone = hasMultiFile ? uploadCount >= maxFiles : status === 'done'
	const isDone = isFullyDone || (status === 'done' && !isPartiallyDone)
	const isActive = status === 'uploading' || status === 'processing'
	const isError = status === 'error'
	const isWaiting = status === 'waiting'

	return (
		<Box
			width="100%"
			borderRadius="16px"
			border="2px solid"
			borderColor={
				isDone
					? 'primary/30'
					: isPartiallyDone
						? 'primary/20'
						: isWaiting
							? 'orange.300/40'
							: isError
								? 'red.300'
								: 'outlineVariant/15'
			}
			bg={
				isDone
					? 'primary/4'
					: isPartiallyDone
						? 'primary/3'
						: isWaiting
							? 'orange.50/40'
							: 'surfaceContainerLowest'
			}
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
						bg={
							isDone || isPartiallyDone
								? 'primary/10'
								: isWaiting
									? 'orange.100'
									: 'surfaceContainer'
						}
						display="flex"
						alignItems="center"
						justifyContent="center"
						flexShrink={0}
					>
						{isDone ? (
							<Check size={22} color="#623153" strokeWidth={2.5} />
						) : isPartiallyDone ? (
							<styled.span fontFamily="heading" fontWeight="700" fontSize="xs" color="primary">
								{uploadCount}/{maxFiles}
							</styled.span>
						) : isWaiting ? (
							<Box style={{ animation: 'gentleBreathe 1.5s ease-in-out infinite' }}>
								<Clock size={22} color="#d97706" strokeWidth={1.5} />
							</Box>
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
									{hasMultiFile ? `${uploadCount} of ${maxFiles} done` : 'Analyzed'}
								</styled.span>
							)}
							{isPartiallyDone && (
								<styled.span
									fontSize="xs"
									fontWeight="600"
									color="primary"
									bg="primary/8"
									paddingInline={2}
									paddingBlock={0.5}
									borderRadius="md"
								>
									{uploadCount} of {maxFiles} sections
								</styled.span>
							)}
							{isWaiting && (
								<styled.span
									fontSize="xs"
									fontWeight="600"
									color="orange.700"
									bg="orange.100"
									paddingInline={2}
									paddingBlock={0.5}
									borderRadius="md"
								>
									Waiting
								</styled.span>
							)}
						</Flex>
						<styled.span fontSize="xs" color="onSurfaceVariant/60">
							{isWaiting ? 'Export started — come back when you get the email' : description}
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

				{/* Partially done — add more button */}
				{isPartiallyDone && !isActive && (
					<styled.label
						display="flex"
						alignItems="center"
						justifyContent="center"
						gap={2}
						paddingBlock={2.5}
						borderRadius="10px"
						border="1.5px dashed"
						borderColor="primary/25"
						bg="primary/4"
						cursor="pointer"
						fontSize="sm"
						fontWeight="600"
						fontFamily="heading"
						color="primary"
						transition="all 0.2s ease"
						_hover={{ bg: 'primary/8', borderColor: 'primary/40' }}
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
							aria-label={`Upload file for ${title}`}
							onChange={handleFileChange}
							style={{ display: 'none' }}
						/>
						<Upload size={15} />
						Add more ({uploadCount} of {maxFiles})
					</styled.label>
				)}

				{/* Waiting state */}
				{isWaiting && onFileReady && (
					<styled.button
						onClick={onFileReady}
						display="flex"
						alignItems="center"
						justifyContent="center"
						gap={2}
						paddingBlock={2.5}
						borderRadius="10px"
						border="1.5px solid"
						borderColor="primary/25"
						bg="primary/4"
						cursor="pointer"
						fontSize="sm"
						fontWeight="600"
						fontFamily="heading"
						color="primary"
						transition="all 0.2s ease"
						_hover={{ bg: 'primary/8', borderColor: 'primary/40' }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
					>
						<Upload size={15} />I have the file now
					</styled.button>
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
					<VStack gap={2} alignItems="stretch">
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
								aria-label={`Upload file for ${title}`}
								onChange={handleFileChange}
								style={{ display: 'none' }}
							/>
							<Upload size={15} />
							{isError ? 'Try again' : 'Upload'}
						</styled.label>

						{/* "I started the export" for delayed sources */}
						{isDelayed && onExportStarted && status === 'idle' && (
							<styled.button
								onClick={onExportStarted}
								display="flex"
								alignItems="center"
								justifyContent="center"
								gap={1.5}
								paddingBlock={2}
								borderRadius="10px"
								border="none"
								bg="transparent"
								cursor="pointer"
								fontSize="xs"
								fontWeight="500"
								color="onSurfaceVariant/60"
								transition="color 0.15s ease"
								_hover={{ color: 'primary' }}
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '2px',
								}}
							>
								<Clock size={13} />I started the export — remind me later
							</styled.button>
						)}
					</VStack>
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
					</VStack>
				</Box>
			)}
		</Box>
	)
}
