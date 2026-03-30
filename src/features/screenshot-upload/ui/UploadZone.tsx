'use client'

import { styled, VStack } from '@styled-system/jsx'
import { Smartphone, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import type { XRayResponse } from '@/entities/xray-result/model/types'
import { trackEvent } from '@/features/analytics'

type UploadState = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'done' | 'error'

const STEPS = [
	'Compressing image',
	'Uploading screenshot',
	'Detecting apps',
	'Generating your X-Ray',
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
	const fileRef = useRef<HTMLInputElement>(null)

	async function handleUpload(file: File) {
		try {
			setState('compressing')
			setStep(0)

			// Client-side compression
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
		<VStack gap={4} width="100%" maxWidth="breakpoint-sm" marginInline="auto">
			<styled.label
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				display="flex"
				flexDir="column"
				alignItems="center"
				justifyContent="center"
				gap={4}
				padding={10}
				border="2px dashed"
				borderColor={dragging ? 'primary' : state === 'error' ? 'red.400' : 'outlineVariant/30'}
				borderRadius="xl"
				bg="surfaceContainerLowest"
				cursor={isProcessing ? 'wait' : 'pointer'}
				transition="border-color 0.2s ease"
				_hover={{ borderColor: isProcessing ? undefined : 'primary/40' }}
				width="100%"
				minHeight="200px"
			>
				<input
					ref={fileRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={onFileChange}
					disabled={isProcessing}
					style={{ display: 'none' }}
				/>

				{state === 'idle' && (
					<>
						<Smartphone size={32} color="#623153" strokeWidth={1.5} />
						<VStack gap={1} textAlign="center">
							<styled.span fontFamily="heading" fontWeight="700" color="onSurface">
								Drop your Screen Time screenshot
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurfaceVariant">
								iPhone: Settings &rarr; Screen Time &rarr; See All Activity &rarr; screenshot
							</styled.span>
							<styled.span textStyle="body.sm" color="onSurfaceVariant">
								Android: Settings &rarr; Digital Wellbeing &rarr; screenshot
							</styled.span>
						</VStack>
						<styled.span
							paddingInline={4}
							paddingBlock={2}
							bg="surfaceContainerHigh"
							borderRadius="full"
							fontSize="sm"
							fontWeight="500"
							color="primary"
						>
							<Upload size={14} style={{ display: 'inline', marginRight: 6 }} />
							Choose image
						</styled.span>
						<styled.span textStyle="body.sm" color="onSurfaceVariant/60" textAlign="center">
							Your screenshot is processed in ~3 seconds and deleted immediately. We never store
							your image.
						</styled.span>
					</>
				)}

				{isProcessing && (
					<VStack gap={3} textAlign="center">
						{STEPS.map((label, i) => (
							<styled.span
								key={label}
								textStyle="body.sm"
								fontWeight={i === step ? '600' : '400'}
								color={i < step ? 'primary' : i === step ? 'onSurface' : 'onSurfaceVariant/40'}
								transition="all 0.3s ease"
							>
								{i < step ? '\u2713 ' : i === step ? '\u25CF ' : '\u25CB '}
								{label}
							</styled.span>
						))}
					</VStack>
				)}

				{state === 'error' && (
					<VStack gap={2} textAlign="center">
						<styled.span textStyle="body.base" color="red.500" fontWeight="500">
							{errorMsg}
						</styled.span>
						<styled.button
							onClick={(e) => {
								e.preventDefault()
								reset()
							}}
							paddingInline={4}
							paddingBlock={2}
							bg="surfaceContainerHigh"
							borderRadius="full"
							fontSize="sm"
							fontWeight="500"
							color="primary"
							border="none"
							cursor="pointer"
						>
							Try again
						</styled.button>
					</VStack>
				)}
			</styled.label>
		</VStack>
	)
}

async function compressImage(file: File): Promise<File> {
	// If already small enough, skip compression
	if (file.size <= 2 * 1024 * 1024) return file

	const bitmap = await createImageBitmap(file)
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
	const ctx = canvas.getContext('2d')
	if (!ctx) return file

	// Scale down if larger than 1568px (Claude Vision optimal)
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
