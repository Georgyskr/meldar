'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { ChevronDown, ChevronUp, Smartphone, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import type { XRayResponse } from '@/entities/xray-result/model/types'
import { trackEvent } from '@/features/analytics'

type UploadState = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'done' | 'error'

const STEPS = [
	{ label: 'Compressing image', icon: '~' },
	{ label: 'Uploading screenshot', icon: '~' },
	{ label: 'Detecting apps', icon: '~' },
	{ label: 'Generating your X-Ray', icon: '~' },
]

export function UploadZone({
	onResult,
}: {
	onResult: (data: XRayResponse & { id: string }) => void
}) {
	const [state, setState] = useState<UploadState>('idle')
	const [step, setStep] = useState(0)
	const [errorMsg, setErrorMsg] = useState('')
	const [dragging, setDragging] = useState(false)
	const [showGuide, setShowGuide] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)

	async function handleUpload(file: File) {
		try {
			setState('compressing')
			setStep(0)

			const compressed = await compressImage(file)

			setState('uploading')
			setStep(1)
			trackEvent({ name: 'screenshot_upload' })

			const formData = new FormData()
			formData.append('screenshot', compressed)

			setState('analyzing')
			setStep(2)

			const res = await fetch('/api/upload/screentime', {
				method: 'POST',
				body: formData,
			})

			const data = await res.json()

			if (!res.ok) {
				setErrorMsg(data.error?.message || 'Analysis failed. Try again.')
				setState('error')
				return
			}

			setStep(3)
			setState('done')
			trackEvent({ name: 'xray_created', xrayId: data.id })
			onResult(data)
		} catch {
			setErrorMsg('Something went wrong. Please try again.')
			setState('error')
		}
	}

	function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (file) handleUpload(file)
	}

	function reset() {
		setState('idle')
		setErrorMsg('')
		setStep(0)
		if (fileRef.current) fileRef.current.value = ''
	}

	function onDragOver(e: React.DragEvent) {
		e.preventDefault()
		if (!isProcessing) setDragging(true)
	}

	function onDragLeave(e: React.DragEvent) {
		e.preventDefault()
		setDragging(false)
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault()
		setDragging(false)
		if (isProcessing) return
		const file = e.dataTransfer.files[0]
		if (file) handleUpload(file)
	}

	const isProcessing = state === 'compressing' || state === 'uploading' || state === 'analyzing'

	return (
		<VStack gap={0} width="100%" maxWidth="480px" marginInline="auto">
			{/* Upload surface */}
			<styled.label
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				display="flex"
				flexDir="column"
				alignItems="center"
				justifyContent="center"
				gap={5}
				padding={8}
				border="2px solid"
				borderColor={dragging ? 'primary' : state === 'error' ? 'red.400' : 'outlineVariant/15'}
				borderRadius="20px"
				bg="surfaceContainerLowest"
				cursor={isProcessing ? 'wait' : 'pointer'}
				transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
				boxShadow={
					dragging
						? '0 0 0 4px rgba(98, 49, 83, 0.1), 0 8px 32px rgba(0, 0, 0, 0.08)'
						: isProcessing
							? 'none'
							: '0 2px 16px rgba(0, 0, 0, 0.04)'
				}
				_hover={{
					borderColor: isProcessing ? undefined : 'primary/30',
					boxShadow: isProcessing ? undefined : '0 4px 24px rgba(98, 49, 83, 0.08)',
				}}
				width="100%"
				minHeight="220px"
				position="relative"
				overflow="hidden"
				style={isProcessing ? { animation: 'scanPulse 2s ease-in-out infinite' } : undefined}
			>
				<input
					ref={fileRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={onFileChange}
					disabled={isProcessing}
					style={{ display: 'none' }}
				/>

				{/* Scan line overlay during processing */}
				{isProcessing && (
					<Box
						position="absolute"
						inset={0}
						overflow="hidden"
						pointerEvents="none"
						borderRadius="18px"
					>
						<Box
							position="absolute"
							left={0}
							right={0}
							height="2px"
							background="linear-gradient(90deg, transparent, #623153, #FFB876, transparent)"
							style={{ animation: 'scanLine 2s ease-in-out infinite' }}
						/>
					</Box>
				)}

				{state === 'idle' && (
					<>
						<Box
							width="56px"
							height="56px"
							borderRadius="16px"
							bg="primary/6"
							display="flex"
							alignItems="center"
							justifyContent="center"
						>
							<Smartphone size={26} color="#623153" strokeWidth={1.5} />
						</Box>
						<VStack gap={2} textAlign="center">
							<styled.span
								fontFamily="heading"
								fontWeight="700"
								fontSize="md"
								color="onSurface"
								letterSpacing="-0.01em"
							>
								Drop your Screen Time screenshot
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurfaceVariant/70" lineHeight="1.5">
								iPhone or Android. Takes 3 seconds to analyze.
							</styled.span>
						</VStack>
						<styled.span
							display="inline-flex"
							alignItems="center"
							gap={2}
							paddingInline={5}
							paddingBlock="10px"
							background="linear-gradient(135deg, #623153 0%, #874a72 100%)"
							borderRadius="12px"
							fontSize="sm"
							fontWeight="600"
							fontFamily="heading"
							color="white"
							boxShadow="0 2px 8px rgba(98, 49, 83, 0.25)"
							transition="all 0.2s ease"
						>
							<Upload size={15} />
							Choose image
						</styled.span>
					</>
				)}

				{isProcessing && (
					<VStack gap={4} textAlign="center" paddingBlock={2} role="status" aria-live="polite">
						{STEPS.map((s, i) => {
							const isDone = i < step
							const isCurrent = i === step
							return (
								<Flex key={s.label} gap={3} alignItems="center">
									<Box
										width="20px"
										height="20px"
										borderRadius="full"
										display="flex"
										alignItems="center"
										justifyContent="center"
										fontSize="xs"
										fontWeight="600"
										bg={isDone ? 'primary' : isCurrent ? 'primary/15' : 'surfaceContainer'}
										color={isDone ? 'white' : isCurrent ? 'primary' : 'onSurfaceVariant/40'}
										transition="all 0.3s ease"
									>
										{isDone ? '\u2713' : ''}
									</Box>
									<styled.span
										textStyle="body.sm"
										fontWeight={isCurrent ? '600' : '400'}
										color={isDone ? 'primary' : isCurrent ? 'onSurface' : 'onSurfaceVariant/40'}
										transition="all 0.3s ease"
										style={
											isCurrent
												? { animation: 'gentleBreathe 1.5s ease-in-out infinite' }
												: undefined
										}
									>
										{s.label}
									</styled.span>
								</Flex>
							)
						})}
					</VStack>
				)}

				{state === 'error' && (
					<VStack gap={3} textAlign="center">
						<Box
							width="48px"
							height="48px"
							borderRadius="full"
							bg="red.50"
							display="flex"
							alignItems="center"
							justifyContent="center"
							marginInline="auto"
						>
							<styled.span fontSize="xl" color="red.500">
								!
							</styled.span>
						</Box>
						<styled.span textStyle="body.base" color="red.600" fontWeight="500">
							{errorMsg}
						</styled.span>
						<styled.button
							onClick={(e) => {
								e.preventDefault()
								reset()
							}}
							paddingInline={5}
							paddingBlock="10px"
							bg="surfaceContainerHigh"
							borderRadius="12px"
							fontSize="sm"
							fontWeight="600"
							fontFamily="heading"
							color="primary"
							border="none"
							cursor="pointer"
							transition="all 0.2s ease"
							_hover={{ bg: 'surfaceContainer' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							Try again
						</styled.button>
					</VStack>
				)}
			</styled.label>

			{/* Inline collapsible guide */}
			{state === 'idle' && (
				<VStack gap={0} width="100%" marginBlockStart={3}>
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
						color="onSurfaceVariant/60"
						paddingBlock={2}
						transition="color 0.15s ease"
						_hover={{ color: 'primary' }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						{showGuide ? 'Hide instructions' : 'Where do I find this?'}
						{showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</styled.button>

					{showGuide && (
						<Box
							width="100%"
							paddingInline={4}
							paddingBlock={4}
							borderRadius="12px"
							bg="surfaceContainer/50"
							style={{ animation: 'meldarFadeSlideUp 0.3s ease-out both' }}
						>
							<Flex gap={6} flexDir={{ base: 'column', sm: 'row' }}>
								<VStack gap={2} flex={1} alignItems="flex-start">
									<styled.span
										fontSize="xs"
										fontWeight="700"
										fontFamily="heading"
										color="onSurface"
										textTransform="uppercase"
										letterSpacing="0.05em"
									>
										iPhone
									</styled.span>
									<styled.ol
										listStyleType="none"
										padding={0}
										margin={0}
										display="flex"
										flexDir="column"
										gap={1}
									>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											1. Settings &rarr; Screen Time
										</styled.li>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											2. See All App &amp; Website Activity
										</styled.li>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											3. Toggle to &ldquo;Week&rdquo;
										</styled.li>
										<styled.li
											textStyle="body.sm"
											color="primary"
											fontWeight="500"
											lineHeight="1.5"
										>
											4. Screenshot the app list
										</styled.li>
									</styled.ol>
								</VStack>
								<VStack gap={2} flex={1} alignItems="flex-start">
									<styled.span
										fontSize="xs"
										fontWeight="700"
										fontFamily="heading"
										color="onSurface"
										textTransform="uppercase"
										letterSpacing="0.05em"
									>
										Android
									</styled.span>
									<styled.ol
										listStyleType="none"
										padding={0}
										margin={0}
										display="flex"
										flexDir="column"
										gap={1}
									>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											1. Settings &rarr; Digital Wellbeing
										</styled.li>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											2. Tap the Dashboard
										</styled.li>
										<styled.li textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
											3. See your app usage list
										</styled.li>
										<styled.li
											textStyle="body.sm"
											color="primary"
											fontWeight="500"
											lineHeight="1.5"
										>
											4. Screenshot the list
										</styled.li>
									</styled.ol>
								</VStack>
							</Flex>
						</Box>
					)}
				</VStack>
			)}
		</VStack>
	)
}

async function compressImage(file: File): Promise<File> {
	if (file.size <= 2 * 1024 * 1024) return file

	const bitmap = await createImageBitmap(file)
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
	const ctx = canvas.getContext('2d')
	if (!ctx) return file

	const maxDim = 1568
	let { width, height } = bitmap
	if (width > maxDim || height > maxDim) {
		const scale = maxDim / Math.max(width, height)
		width = Math.round(width * scale)
		height = Math.round(height * scale)
		canvas.width = width
		canvas.height = height
	}

	ctx.drawImage(bitmap, 0, 0, width, height)
	const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
	return new File([blob], file.name, { type: 'image/jpeg' })
}
