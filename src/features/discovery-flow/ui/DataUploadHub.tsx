'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Brain, Camera, MessageSquare, Search } from 'lucide-react'
import { useState } from 'react'
import { UploadCard } from './UploadCard'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

type SourceState = {
	status: UploadStatus
	progress?: number
	errorMessage?: string
}

type DataUploadHubProps = {
	sessionId: string
	onGenerateResults: () => void
	onSkip: () => void
}

const PLATFORMS = [
	{
		id: 'screentime' as const,
		title: 'Screen Time',
		description: 'Screenshot from your phone settings',
		timeEstimate: '30 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: Camera,
	},
	{
		id: 'chatgpt' as const,
		title: 'ChatGPT History',
		description: 'Export from Settings > Data controls',
		timeEstimate: '2 min',
		accept: '.zip',
		icon: MessageSquare,
	},
	{
		id: 'claude' as const,
		title: 'Claude History',
		description: 'Export from Settings > Export data',
		timeEstimate: '2 min',
		accept: '.json',
		icon: Brain,
	},
	{
		id: 'google' as const,
		title: 'Google Takeout',
		description: 'Download from takeout.google.com',
		timeEstimate: '5 min',
		accept: '.zip',
		icon: Search,
	},
] as const

type PlatformId = (typeof PLATFORMS)[number]['id']

function ScreenTimeInstructions() {
	return (
		<Flex gap={6} flexDir={{ base: 'column', sm: 'row' }}>
			<VStack gap={1} flex={1} alignItems="flex-start">
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
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					1. Settings &rarr; Screen Time
				</styled.span>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					2. See All App &amp; Website Activity
				</styled.span>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					3. Toggle to &ldquo;Week&rdquo;
				</styled.span>
				<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
					4. Screenshot the app list
				</styled.span>
			</VStack>
			<VStack gap={1} flex={1} alignItems="flex-start">
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
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					1. Settings &rarr; Digital Wellbeing
				</styled.span>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					2. Tap the Dashboard
				</styled.span>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					3. See your app usage list
				</styled.span>
				<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
					4. Screenshot the list
				</styled.span>
			</VStack>
		</Flex>
	)
}

function ChatGPTInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Open ChatGPT &rarr; Settings
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Data controls &rarr; Export data
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Click &ldquo;Export&rdquo; and wait for email
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Download the .zip and upload it here
			</styled.span>
		</VStack>
	)
}

function ClaudeInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Open Claude &rarr; Settings
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Click &ldquo;Export data&rdquo;
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Wait for the download email
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Upload the .json file here
			</styled.span>
		</VStack>
	)
}

function GoogleInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Go to takeout.google.com
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Select only: Search, YouTube, Chrome
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Click &ldquo;Create export&rdquo; and wait
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Download the .zip and upload it here
			</styled.span>
		</VStack>
	)
}

const INSTRUCTION_MAP: Record<PlatformId, () => React.ReactNode> = {
	screentime: ScreenTimeInstructions,
	chatgpt: ChatGPTInstructions,
	claude: ClaudeInstructions,
	google: GoogleInstructions,
}

export function DataUploadHub({ sessionId, onGenerateResults, onSkip }: DataUploadHubProps) {
	const [sources, setSources] = useState<Record<PlatformId, SourceState>>({
		screentime: { status: 'idle' },
		chatgpt: { status: 'idle' },
		claude: { status: 'idle' },
		google: { status: 'idle' },
	})

	const doneCount = Object.values(sources).filter((s) => s.status === 'done').length
	const hasAnyUpload = doneCount > 0
	const isAnyActive = Object.values(sources).some(
		(s) => s.status === 'uploading' || s.status === 'processing',
	)

	async function handleFile(platformId: PlatformId, file: File) {
		setSources((prev) => ({
			...prev,
			[platformId]: { status: 'uploading', progress: 30 },
		}))

		try {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('platform', platformId)
			formData.append('sessionId', sessionId)

			setSources((prev) => ({
				...prev,
				[platformId]: { status: 'processing', progress: 70 },
			}))

			const res = await fetch('/api/discovery/upload', {
				method: 'POST',
				body: formData,
			})

			if (!res.ok) {
				const data = await res.json()
				setSources((prev) => ({
					...prev,
					[platformId]: {
						status: 'error',
						errorMessage: data.error?.message || 'Upload failed. Try again.',
					},
				}))
				return
			}

			setSources((prev) => ({
				...prev,
				[platformId]: { status: 'done' },
			}))
		} catch {
			setSources((prev) => ({
				...prev,
				[platformId]: { status: 'error', errorMessage: 'Connection failed. Try again.' },
			}))
		}
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
				<styled.h2 textStyle="heading.section" color="onSurface">
					Add your data
				</styled.h2>
				<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
					The more you add, the sharper your results
				</styled.p>
			</VStack>

			{/* Progress dots */}
			<Flex gap={2} justifyContent="center" alignItems="center">
				{PLATFORMS.map((p) => (
					<Box
						key={p.id}
						width="10px"
						height="10px"
						borderRadius="full"
						bg={sources[p.id].status === 'done' ? 'primary' : 'outlineVariant/20'}
						transition="all 0.3s ease"
					/>
				))}
				<styled.span
					fontSize="xs"
					fontWeight="500"
					color="onSurfaceVariant/50"
					marginInlineStart={2}
				>
					{doneCount} of {PLATFORMS.length} sources
				</styled.span>
			</Flex>

			{/* Upload cards */}
			<Grid columns={{ base: 1, md: 2 }} gap={4} width="100%">
				{PLATFORMS.map((p, i) => {
					const InstructionComponent = INSTRUCTION_MAP[p.id]
					return (
						<Box key={p.id} style={{ animation: `staggerFadeIn 0.4s ease-out ${i * 0.1}s both` }}>
							<UploadCard
								title={p.title}
								description={p.description}
								timeEstimate={p.timeEstimate}
								accept={p.accept}
								icon={p.icon}
								status={sources[p.id].status}
								progress={sources[p.id].progress}
								errorMessage={sources[p.id].errorMessage}
								onFile={(file) => handleFile(p.id, file)}
								instructions={<InstructionComponent />}
							/>
						</Box>
					)
				})}
			</Grid>

			{/* CTAs */}
			<VStack gap={3} width="100%" maxWidth="400px" marginInline="auto" paddingBlockStart={2}>
				<styled.button
					onClick={onGenerateResults}
					disabled={!hasAnyUpload || isAnyActive}
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
					transition="all 0.2s ease"
					boxShadow={hasAnyUpload ? '0 4px 20px rgba(98, 49, 83, 0.25)' : 'none'}
					_hover={{ opacity: 0.9 }}
					_disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					Generate my results
				</styled.button>

				<styled.button
					onClick={onSkip}
					disabled={isAnyActive}
					width="100%"
					paddingBlock={2.5}
					bg="transparent"
					border="none"
					fontSize="sm"
					fontWeight="500"
					color="onSurfaceVariant/50"
					cursor="pointer"
					transition="color 0.15s ease"
					_hover={{ color: 'onSurface' }}
					_disabled={{ cursor: 'not-allowed' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					Skip — just use my quiz answers
				</styled.button>
			</VStack>
		</VStack>
	)
}
