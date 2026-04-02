'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Check, ChevronDown, ChevronUp, Clock, type LucideIcon, Upload, X } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import type { UploadPreviewData } from '../model/atoms'

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
	isDelayed?: boolean
	onExportStarted?: () => void
	onFileReady?: () => void
	maxFiles?: number
	uploadCount?: number
	preview?: UploadPreviewData
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
	preview,
}: UploadCardProps) {
	const [showGuide, setShowGuide] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = e.target.files
		if (!files) return
		// Process all selected files (supports multi-select for Screen Time)
		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			if (file) onFile(file)
		}
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
							multiple={hasMultiFile}
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
								multiple={hasMultiFile}
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

			{/* Preview: the "wow" moment — show what we extracted */}
			{(isDone || isPartiallyDone) && preview && <UploadPreview data={preview} />}
		</Box>
	)
}

function UploadPreview({ data }: { data: UploadPreviewData }) {
	// Screen time apps
	if (Array.isArray(data.apps) && data.apps.length > 0) {
		const topApps = data.apps.slice(0, 5)
		const maxMin = topApps[0]?.usageMinutes || 1
		return (
			<Box
				paddingInline={5}
				paddingBlockEnd={4}
				style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
			>
				<styled.span
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					color="primary"
					textTransform="uppercase"
					letterSpacing="0.05em"
					display="block"
					marginBlockEnd={2}
				>
					What we found
				</styled.span>
				{data.totalScreenTimeMinutes && (
					<Flex
						gap={2}
						alignItems="baseline"
						marginBlockEnd={3}
						style={{ animation: 'staggerFadeIn 0.3s ease-out 0.1s both' }}
					>
						<styled.span
							fontFamily="heading"
							fontWeight="800"
							fontSize="xl"
							color="onSurface"
							letterSpacing="-0.02em"
						>
							{Math.round((data.totalScreenTimeMinutes / 60) * 10) / 10}h
						</styled.span>
						<styled.span fontSize="xs" color="onSurfaceVariant/60">
							total screen time/day
						</styled.span>
					</Flex>
				)}
				<VStack gap={1} width="100%">
					{topApps.map((app, i) => {
						const barWidth = Math.max(((app.usageMinutes ?? 0) / maxMin) * 100, 4)
						return (
							<Flex
								key={app.name}
								alignItems="center"
								gap={2}
								width="100%"
								style={{
									animation: `staggerFadeIn 0.3s ease-out ${0.15 + i * 0.07}s both`,
								}}
							>
								<styled.span
									fontSize="xs"
									color="onSurfaceVariant/60"
									width="80px"
									flexShrink={0}
									overflow="hidden"
									textOverflow="ellipsis"
									whiteSpace="nowrap"
								>
									{app.name}
								</styled.span>
								<Box flex={1} height="4px" borderRadius="full" bg="outlineVariant/10">
									<Box
										height="100%"
										borderRadius="full"
										background={i === 0 ? 'linear-gradient(90deg, #623153, #FFB876)' : 'primary/20'}
										style={{
											width: `${barWidth}%`,
											animation: `barFill 0.5s ease-out ${0.2 + i * 0.07}s both`,
										}}
									/>
								</Box>
								<styled.span
									fontSize="xs"
									fontWeight="600"
									fontFamily="heading"
									color={i === 0 ? 'primary' : 'onSurfaceVariant/60'}
									width="32px"
									textAlign="right"
									flexShrink={0}
								>
									{app.usageMinutes
										? app.usageMinutes >= 60
											? `${Math.round((app.usageMinutes / 60) * 10) / 10}h`
											: `${app.usageMinutes}m`
										: ''}
								</styled.span>
							</Flex>
						)
					})}
				</VStack>
				{typeof data.pickups === 'number' && data.pickups > 0 && (
					<styled.span
						fontSize="xs"
						color="onSurfaceVariant/50"
						marginBlockStart={2}
						display="block"
						style={{ animation: 'staggerFadeIn 0.3s ease-out 0.5s both' }}
					>
						{data.pickups} pickups/day
					</styled.span>
				)}
			</Box>
		)
	}

	// Subscriptions
	if (Array.isArray(data.subscriptions) && data.subscriptions.length > 0) {
		return (
			<Box
				paddingInline={5}
				paddingBlockEnd={4}
				style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
			>
				<styled.span
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					color="primary"
					textTransform="uppercase"
					letterSpacing="0.05em"
					display="block"
					marginBlockEnd={2}
				>
					What we found
				</styled.span>
				<VStack gap={1} width="100%">
					{data.subscriptions.slice(0, 6).map((sub, i) => (
						<Flex
							key={sub.name}
							justifyContent="space-between"
							alignItems="center"
							width="100%"
							style={{ animation: `staggerFadeIn 0.3s ease-out ${0.1 + i * 0.06}s both` }}
						>
							<styled.span fontSize="xs" color="onSurface">
								{sub.name}
							</styled.span>
							<styled.span fontSize="xs" fontWeight="600" fontFamily="heading" color="primary">
								{sub.price}
								{sub.frequency ? `/${sub.frequency}` : ''}
							</styled.span>
						</Flex>
					))}
				</VStack>
			</Box>
		)
	}

	// Health metrics / calendar events / other
	if (Array.isArray(data.metrics) && data.metrics.length > 0) {
		return (
			<Box
				paddingInline={5}
				paddingBlockEnd={4}
				style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
			>
				<styled.span
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					color="primary"
					textTransform="uppercase"
					letterSpacing="0.05em"
					display="block"
					marginBlockEnd={2}
				>
					What we found
				</styled.span>
				<VStack gap={1} width="100%">
					{data.metrics.slice(0, 5).map((m, i) => (
						<Flex
							key={m.name}
							justifyContent="space-between"
							width="100%"
							style={{ animation: `staggerFadeIn 0.3s ease-out ${0.1 + i * 0.06}s both` }}
						>
							<styled.span fontSize="xs" color="onSurfaceVariant">
								{m.name}
							</styled.span>
							<styled.span fontSize="xs" fontWeight="600" color="onSurface">
								{m.value}
								{m.unit ? ` ${m.unit}` : ''}
							</styled.span>
						</Flex>
					))}
				</VStack>
			</Box>
		)
	}

	if (Array.isArray(data.events) && data.events.length > 0) {
		return (
			<Box
				paddingInline={5}
				paddingBlockEnd={4}
				style={{ animation: 'meldarFadeSlideUp 0.4s ease-out both' }}
			>
				<styled.span
					fontSize="xs"
					fontWeight="600"
					fontFamily="heading"
					color="primary"
					textTransform="uppercase"
					letterSpacing="0.05em"
					display="block"
					marginBlockEnd={2}
				>
					{data.events.length} events this week
				</styled.span>
				<VStack gap={1} width="100%">
					{data.events.slice(0, 4).map((e, i) => (
						<Flex
							key={`${e.title}-${e.day}-${e.time}`}
							gap={2}
							alignItems="center"
							width="100%"
							style={{ animation: `staggerFadeIn 0.3s ease-out ${0.1 + i * 0.06}s both` }}
						>
							<styled.span fontSize="xs" color="onSurfaceVariant/50" width="40px" flexShrink={0}>
								{e.day || ''}
							</styled.span>
							<styled.span fontSize="xs" color="onSurface" flex={1}>
								{e.title}
							</styled.span>
							{e.time && (
								<styled.span fontSize="xs" color="onSurfaceVariant/60" flexShrink={0}>
									{e.time}
								</styled.span>
							)}
						</Flex>
					))}
				</VStack>
			</Box>
		)
	}

	return null
}
