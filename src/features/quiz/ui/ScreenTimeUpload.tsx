'use client'

import { styled, VStack } from '@styled-system/jsx'
import { Smartphone, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

type ScreenTimeResult = {
	apps: { name: string; hours: number; category: string }[]
	totalHours: number
	topApp: string
	pickups: number | null
	insight: string
}

export function ScreenTimeUpload() {
	const [state, setState] = useState<UploadState>('idle')
	const [result, setResult] = useState<ScreenTimeResult | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	async function handleUpload(file: File) {
		setState('uploading')

		const formData = new FormData()
		formData.append('screenshot', file)

		try {
			setState('analyzing')
			const res = await fetch('/api/analyze-screenshot', {
				method: 'POST',
				body: formData,
			})

			if (!res.ok) throw new Error('Analysis failed')

			const data = await res.json()
			setResult(data)
			setState('done')
		} catch {
			setState('error')
		}
	}

	function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (file) handleUpload(file)
	}

	if (state === 'done' && result) {
		return (
			<VStack
				gap={6}
				width="100%"
				maxWidth="breakpoint-sm"
				marginInline="auto"
				padding={8}
				bg="surfaceContainerLowest"
				borderRadius="xl"
				border="1px solid"
				borderColor="outlineVariant/10"
			>
				<styled.h3
					fontFamily="heading"
					fontSize="xl"
					fontWeight="700"
					color="onSurface"
					textAlign="center"
				>
					Your phone in numbers
				</styled.h3>
				<styled.p
					fontFamily="heading"
					fontSize="4xl"
					fontWeight="800"
					color="primary"
					textAlign="center"
				>
					{result.totalHours} hrs/day
				</styled.p>
				<styled.p textStyle="body.base" color="onSurfaceVariant" textAlign="center">
					{result.insight}
				</styled.p>
				<VStack gap={2} width="100%">
					{result.apps.slice(0, 5).map((app) => (
						<styled.div
							key={app.name}
							display="flex"
							justifyContent="space-between"
							width="100%"
							paddingBlock={2}
							borderBlockEnd="1px solid"
							borderColor="outlineVariant/10"
						>
							<styled.span textStyle="body.sm" color="onSurface">
								{app.name}
							</styled.span>
							<styled.span textStyle="body.sm" color="primary" fontWeight="500">
								{app.hours}h
							</styled.span>
						</styled.div>
					))}
				</VStack>
			</VStack>
		)
	}

	return (
		<VStack gap={4} width="100%" maxWidth="breakpoint-sm" marginInline="auto">
			<styled.label
				display="flex"
				flexDir="column"
				alignItems="center"
				justifyContent="center"
				gap={4}
				padding={10}
				border="2px dashed"
				borderColor={state === 'error' ? 'error' : 'outlineVariant/30'}
				borderRadius="xl"
				bg="surfaceContainerLowest"
				cursor="pointer"
				transition="border-color 0.2s ease"
				_hover={{ borderColor: 'primary/40' }}
				width="100%"
			>
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					onChange={onFileChange}
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
					</>
				)}

				{(state === 'uploading' || state === 'analyzing') && (
					<styled.span textStyle="body.base" color="primary" fontWeight="500">
						{state === 'uploading' ? 'Uploading...' : 'Reading your screen time...'}
					</styled.span>
				)}

				{state === 'error' && (
					<VStack gap={2} textAlign="center">
						<styled.span textStyle="body.base" color="error" fontWeight="500">
							Couldn&apos;t read that image. Try another screenshot.
						</styled.span>
						<styled.span
							paddingInline={4}
							paddingBlock={2}
							bg="surfaceContainerHigh"
							borderRadius="full"
							fontSize="sm"
							fontWeight="500"
							color="primary"
							cursor="pointer"
						>
							Try again
						</styled.span>
					</VStack>
				)}
			</styled.label>
		</VStack>
	)
}
